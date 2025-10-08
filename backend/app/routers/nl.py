"""
Natural Language Processing Router - With comprehensive data fetching
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


def get_comprehensive_historical_data(country_iso: str) -> Dict[str, Any]:
    """
    Fetch comprehensive historical forest data from ALL verified working GFW datasets.
    """
    from app.routers.simulate import (
        get_geostore, 
        get_forest_area, 
        get_carbon_emissions, 
        get_historical_loss
    )
    # ✅ FIXED: Changed from enhanced_data_fetch to data_fetch
    from app.services.data_fetch import get_comprehensive_forest_data
    
    print(f"\n🌍 Processing query for {country_iso}...")
    
    # Initialize with defaults
    country_name = country_iso
    area_ha = 0
    forest_area = 0
    emissions = 0
    geometry = None
    geostore_id = None
    historical = []
    
    # Step 1: Get geostore (most critical)
    try:
        print(f"   Fetching geostore...")
        country_info = get_geostore(country_iso)
        geometry = country_info["attributes"]["geojson"]["features"][0]["geometry"]
        geostore_id = country_info["id"]
        area_ha = country_info["attributes"]["areaHa"]
        country_name = country_info["attributes"]["info"]["name"]
        print(f"   ✓ Geostore: {country_name}")
    except HTTPException as e:
        error_msg = f"GFW API error for {country_iso}: {e.detail}"
        print(f"   ❌ {error_msg}")
        raise HTTPException(
            status_code=e.status_code,
            detail=error_msg
        )
    except Exception as e:
        error_msg = f"Failed to fetch geostore for {country_iso}: {str(e)}"
        print(f"   ❌ {error_msg}")
        raise HTTPException(
            status_code=500,
            detail=error_msg
        )
    
    # Step 2: Get forest area (optional - continue if fails)
    if geometry:
        try:
            print(f"   Fetching forest area...")
            forest_area = get_forest_area(geometry)
            print(f"   ✓ Forest area: {forest_area:,.0f} ha")
        except Exception as e:
            print(f"   ⚠ Forest area fetch failed: {str(e)}")
            forest_area = area_ha * 0.3  # Estimate 30% forest cover
    
    # Step 3: Get carbon emissions (optional)
    if geometry:
        try:
            print(f"   Fetching emissions...")
            emissions = get_carbon_emissions(geometry)
            print(f"   ✓ Emissions: {emissions:,.0f} Mg CO2e")
        except Exception as e:
            print(f"   ⚠ Emissions fetch failed: {str(e)}")
            emissions = 0
    
    # Step 4: Get historical loss (critical for analysis)
    if geostore_id:
        try:
            print(f"   Fetching historical loss...")
            historical = get_historical_loss(geostore_id)
            print(f"   ✓ Historical: {len(historical)} years")
        except Exception as e:
            print(f"   ⚠ Historical loss fetch failed: {str(e)}")
            historical = []
    
    # Step 5: Get comprehensive datasets (NEW - this is what was missing!)
    comprehensive_data = {}
    if geostore_id and geometry:
        try:
            print(f"\n   📊 Fetching additional datasets...")
            comprehensive_data = get_comprehensive_forest_data(country_iso, geostore_id, geometry)
            print(f"   ✓ Additional datasets fetched")
        except Exception as e:
            print(f"   ⚠ Comprehensive data fetch failed: {str(e)}")
    
    # Build response
    combined_timeseries = []
    for record in historical:
        combined_timeseries.append({
            "year": record["year"],
            "loss_ha": record["loss_ha"],
            "type": "observed"
        })
    
    historical_total = sum(r["loss_ha"] for r in historical) if historical else 0
    
    print(f"✅ Data fetch complete for {country_name}\n")
    
    return {
        "country": country_name,
        "country_iso": country_iso,
        "total_area_ha": area_ha,
        "forest_area_ha": forest_area,
        "baseline_emissions_Mg_CO2e": emissions,
        "geometry": geometry,
        "geostore_id": geostore_id,
        
        "analysis_period": {
            "historical_years": f"{min(r['year'] for r in historical)}-{max(r['year'] for r in historical)}" if historical else "No data",
        },
        
        "combined_timeseries": combined_timeseries,
        
        "summary": {
            "historical_records": len(historical),
            "historical_total_loss_ha": historical_total,
            "scenario_type": "comprehensive_historical_analysis",
        },
        
        # NEW DATASETS - This is what was missing!
        "tree_cover_gain": comprehensive_data.get("tree_cover_gain", {"status": "not_available", "total_gain_ha": 0}),
        "fire_alerts": comprehensive_data.get("fire_alerts", {"status": "not_available", "total_alerts": 0}),
        "protected_areas": comprehensive_data.get("protected_areas", {"status": "not_available", "categories": []}),
        "primary_forest": comprehensive_data.get("primary_forest", {"status": "not_available", "primary_forest_ha": 0}),
        
        "datasets_included": [
            "tree_cover_loss",
            "tree_cover_gain",
            "fire_alerts",
            "protected_areas",
            "primary_forest",
            "carbon_emissions"
        ],
        
        "data_quality": {
            "geostore": "success" if geostore_id else "failed",
            "forest_area": "success" if forest_area > 0 else "estimated",
            "emissions": "success" if emissions > 0 else "unavailable",
            "historical_loss": "success" if len(historical) > 0 else "unavailable",
            "additional_datasets": "partial" if comprehensive_data else "unavailable"
        }
    }


def call_enhanced_simulation(country_iso: str, percent_loss: float, target_year: int) -> Dict[str, Any]:
    """Call the enhanced simulation function for future projections."""
    try:
        from app.routers.simulate import simulate_forest_loss_dual
        return simulate_forest_loss_dual(country_iso, percent_loss, target_year)
    except ImportError:
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
                raise HTTPException(status_code=408, detail=f"Simulation timed out after {max_retries} attempts")
        except requests.exceptions.RequestException as e:
            if attempt < max_retries - 1:
                time.sleep(2)
            else:
                raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")
        except HTTPException:
            raise
        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(1)
            else:
                raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


@router.post("/")
def nl_query_handler(payload: NLQuery):
    """Process natural language query and return comprehensive forest data."""
    
    # Parse query
    try:
        parsed = parse_nl_query(payload.query)
    except Exception as e:
        return {
            "status": "error",
            "error": f"NLP failed: {str(e)}",
            "query": payload.query
        }

    if parsed.get("status") != "success":
        return parsed

    # Extract scenario
    try:
        scenario = parsed["structured_scenario"]
        country_iso = scenario.get("country")
        
        if not country_iso:
            return {
                "status": "error",
                "error": "Country required",
                "nl_query": payload.query
            }
        
        # Check if projection or historical
        has_projection = "forest_loss_percent" in scenario and "target_year" in scenario
        
        if has_projection:
            # PROJECTION QUERY
            from app.routers.simulate import simulate_forest_loss_dual
            
            try:
                sim_result = simulate_forest_loss_dual(
                    country_iso=country_iso,
                    percent_loss=scenario["forest_loss_percent"] / 100.0,
                    target_year=scenario["target_year"]
                )
                return {
                    "status": "success",
                    "query_type": "projection",
                    "nl_query": payload.query,
                    "structured_scenario": scenario,
                    "model_used": parsed.get("model_used"),
                    "simulation_result": sim_result
                }
            except Exception as e:
                return {
                    "status": "error",
                    "error": f"Projection failed: {str(e)}",
                    "nl_query": payload.query
                }
        else:
            # HISTORICAL QUERY - NOW CALLS THE COMPREHENSIVE VERSION
            try:
                historical_data = get_comprehensive_historical_data(country_iso)
                
                return {
                    "status": "success",
                    "query_type": "historical",
                    "nl_query": payload.query,
                    "structured_scenario": {"country": country_iso},
                    "model_used": parsed.get("model_used"),
                    "simulation_result": historical_data
                }
            except HTTPException as e:
                return {
                    "status": "error",
                    "error": str(e.detail),
                    "nl_query": payload.query,
                    "country": country_iso
                }
            except Exception as e:
                return {
                    "status": "error",
                    "error": f"Data fetch failed: {str(e)}",
                    "nl_query": payload.query,
                    "country": country_iso
                }
        
    except Exception as e:
        return {
            "status": "error",
            "error": f"Processing failed: {str(e)}",
            "nl_query": payload.query
        }