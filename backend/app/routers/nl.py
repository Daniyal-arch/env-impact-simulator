"""
Clean Natural Language Processing Router - Single endpoint
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import requests
import time
from typing import Dict, Any

from app.services.nlp import parse_nl_query

router = APIRouter(prefix="/nl", tags=["Natural Language"])

class NLQuery(BaseModel):
    query: str

def call_enhanced_simulation(country_iso: str, percent_loss: float, target_year: int) -> Dict[str, Any]:
    """
    Call the enhanced simulation function directly (internal API call).
    This ensures we get the dual projection format.
    """
    
    # Import the enhanced function from simulate.py
    try:
        from simulate import simulate_forest_loss_enhanced
        return simulate_forest_loss_enhanced(country_iso, percent_loss, target_year)
    except ImportError:
        # Fallback: make HTTP request to the simulation endpoint
        import requests
        import os
        
        base_url = os.getenv("BASE_URL", "http://localhost:8000")
        response = requests.post(
            f"{base_url}/simulate/",
            json={
                "country": country_iso,
                "forest_loss_percent": percent_loss * 100,
                "target_year": target_year
            },
            timeout=120
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Simulation API failed: {response.text}"
            )


def simulate_with_retry(country_iso: str, percent_loss: float, target_year: int, max_retries: int = 3) -> Dict[str, Any]:
    """Simulate with retry logic for timeout handling."""
    
    for attempt in range(max_retries):
        try:
            result = call_enhanced_simulation(country_iso, percent_loss, target_year)
            return result
            
        except requests.exceptions.Timeout:
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt
                time.sleep(wait_time)
            else:
                raise HTTPException(
                    status_code=408,
                    detail=f"Forest simulation timed out after {max_retries} attempts. The service is currently slow."
                )
        
        except requests.exceptions.RequestException as e:
            if attempt < max_retries - 1:
                time.sleep(2)
            else:
                raise HTTPException(
                    status_code=500,
                    detail=f"Forest simulation failed: {str(e)}"
                )
        
        except HTTPException:
            raise
        
        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(1)
            else:
                raise HTTPException(
                    status_code=500,
                    detail=f"Simulation processing failed: {str(e)}"
                )


@router.post("/")
def nl_simulate(payload: NLQuery):
    """
    Process natural language query and run enhanced forest loss simulation.
    Returns dual projections: user scenario + trend-based.
    """
    
    # Step 1: Parse natural language query
    try:
        parsed = parse_nl_query(payload.query)
    except Exception as e:
        return {
            "status": "error",
            "error": f"Natural language processing failed: {str(e)}",
            "query": payload.query
        }

    # Step 2: Check if NLP parsing was successful
    if parsed.get("status") != "success":
        return parsed

    # Step 3: Extract and validate structured scenario
    try:
        scenario = parsed["structured_scenario"]
        
        # Validate scenario structure
        required_fields = ["country", "forest_loss_percent", "target_year"]
        missing_fields = [field for field in required_fields if field not in scenario]
        
        if missing_fields:
            return {
                "status": "error",
                "error": f"Missing required fields: {', '.join(missing_fields)}",
                "nl_query": payload.query,
                "parsed_scenario": scenario
            }
        
    except Exception as e:
        return {
            "status": "error",
            "error": f"Failed to extract structured scenario: {str(e)}",
            "nl_query": payload.query,
            "raw_parsed": parsed
        }

    # Step 4: Run enhanced forest loss simulation
    try:
        sim_result = simulate_with_retry(
            country_iso=scenario["country"],
            percent_loss=scenario["forest_loss_percent"] / 100.0,
            target_year=scenario["target_year"]
        )
        
        return {
            "status": "success",
            "nl_query": payload.query,
            "structured_scenario": scenario,
            "model_used": parsed.get("model_used", "unknown"),
            "simulation_result": sim_result
        }
    
    except HTTPException as e:
        return {
            "status": "error",
            "error": e.detail,
            "error_code": e.status_code,
            "nl_query": payload.query,
            "structured_scenario": scenario
        }
    
    except Exception as e:
        return {
            "status": "error",
            "error": f"Simulation processing failed: {str(e)}",
            "nl_query": payload.query,
            "structured_scenario": scenario
        }