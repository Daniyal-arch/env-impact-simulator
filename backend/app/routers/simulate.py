"""
Enhanced Forest loss simulation service with dual projections:
1. User scenario projection (hypothetical)
2. Historical trend projection (realistic baseline)
"""

import os
import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
from typing import Dict, List, Any


load_dotenv()

router = APIRouter()

# ========================
# CONFIG
# ========================
GFW_API_KEY = os.getenv("GFW_API_KEY")
if not GFW_API_KEY:
    raise RuntimeError("GFW_API_KEY not found in .env")

BASE_URL = "https://data-api.globalforestwatch.org"
HEADERS = {"x-api-key": GFW_API_KEY, "Content-Type": "application/json"}


# ========================
# Pydantic Schemas
# ========================
class SimulationRequest(BaseModel):
    country: str  # Any country name or code
    forest_loss_percent: float  # e.g. 10 for 10%
    target_year: int  # e.g. 2030


# ========================
# GFW API Functions (same as before)
# ========================
def get_geostore(country_iso: str) -> dict:
    """Fetch geostore data for a country."""
    url = f"{BASE_URL}/geostore/admin/{country_iso}"
    resp = requests.get(url, headers=HEADERS, timeout=60)
    if resp.status_code != 200:
        raise HTTPException(
            status_code=404, 
            detail=f"Failed to fetch geostore for {country_iso}: {resp.text}"
        )
    return resp.json()["data"]


def get_forest_area(geometry: dict) -> float:
    """Query baseline forest area using GFW tree cover density dataset."""
    dataset = "umd_tree_cover_density_2000"
    version = "v1.6"
    url = f"{BASE_URL}/dataset/{dataset}/{version}/query/json"

    sql = """
    SELECT SUM(area__ha) as forest_area_ha
    FROM results
    WHERE umd_tree_cover_density_2000__threshold >= 30
    """

    payload = {"sql": sql.strip(), "geometry": geometry}
    resp = requests.post(url, headers=HEADERS, json=payload, timeout=60)
    
    if resp.status_code != 200:
        raise HTTPException(
            status_code=500, 
            detail=f"Forest area query failed: {resp.text}"
        )

    data = resp.json().get("data", [])
    if not data or data[0].get("forest_area_ha") is None:
        raise HTTPException(
            status_code=500, 
            detail="Forest area not found in GFW response"
        )

    return data[0]["forest_area_ha"]


def get_carbon_emissions(geometry: dict) -> float:
    """Query baseline carbon emissions using GFW carbon dataset."""
    dataset = "gfw_forest_carbon_gross_emissions"
    version = "v20220316"
    url = f"{BASE_URL}/dataset/{dataset}/{version}/query/json"

    sql = """
    SELECT SUM(gfw_forest_carbon_gross_emissions__Mg_CO2e) as total_emissions
    FROM results
    """

    payload = {"sql": sql.strip(), "geometry": geometry}
    resp = requests.post(url, headers=HEADERS, json=payload, timeout=60)
    
    if resp.status_code != 200:
        raise HTTPException(
            status_code=500, 
            detail=f"Carbon emissions query failed: {resp.text}"
        )

    data = resp.json().get("data", [])
    if not data or data[0].get("total_emissions") is None:
        raise HTTPException(
            status_code=500, 
            detail="Carbon emissions not found in GFW response"
        )

    return data[0]["total_emissions"]


def get_historical_loss(geostore_id: str) -> list:
    """Fetch historical tree cover loss data for time series analysis."""
    dataset = "umd_tree_cover_loss"
    version = "v1.9"
    url = f"{BASE_URL}/dataset/{dataset}/{version}/query/json"

    # Query for all available historical data
    sql = """
    SELECT umd_tree_cover_loss__year, SUM(area__ha) as loss_ha 
    FROM results 
    WHERE umd_tree_cover_loss__year >= 2001
    GROUP BY umd_tree_cover_loss__year 
    ORDER BY umd_tree_cover_loss__year
    """

    params = {"sql": sql, "geostore_id": geostore_id}
    
    resp = requests.get(url, headers=HEADERS, params=params, timeout=60)
    
    if resp.status_code != 200:
        raise HTTPException(
            status_code=500, 
            detail=f"Historical loss query failed: {resp.text}"
        )

    result = resp.json()
    raw_data = result.get("data", [])

    if not raw_data:
        raise HTTPException(
            status_code=500, 
            detail="No historical data available for this country"
        )

    # Process and clean data
    cleaned = []
    for record in raw_data:
        year = record.get("umd_tree_cover_loss__year")
        loss_ha = record.get("loss_ha", 0)
        
        # Skip null years
        if year is None or str(year).lower() == "null":
            continue
            
        try:
            year_int = int(year)
            loss_float = float(loss_ha) if loss_ha else 0
            
            if year_int >= 2001 and year_int <= 2030:
                cleaned.append({
                    "year": year_int,
                    "loss_ha": loss_float
                })
        except (ValueError, TypeError):
            continue

    if not cleaned:
        raise HTTPException(
            status_code=500, 
            detail="No valid historical data found after cleaning"
        )
        
    return cleaned


# ========================
# Enhanced Simulation Logic
# ========================
def calculate_trend_projection(historical: List[Dict], target_year: int, forest_area: float) -> Dict[str, Any]:
    """Calculate trend-based projection from recent historical data."""
    
    if len(historical) < 3:
        # Not enough data for trend analysis
        recent_avg = sum(r["loss_ha"] for r in historical) / len(historical)
        return {
            "method": "simple_average",
            "annual_loss_ha": recent_avg,
            "description": f"Based on {len(historical)}-year average"
        }
    
    # Use last 5 years for trend calculation (more stable than last 3)
    recent_data = historical[-5:] if len(historical) >= 5 else historical[-3:]
    recent_years = [r["year"] for r in recent_data]
    recent_losses = [r["loss_ha"] for r in recent_data]
    
    # Calculate linear trend
    n = len(recent_years)
    sum_x = sum(recent_years)
    sum_y = sum(recent_losses)
    sum_xy = sum(x*y for x, y in zip(recent_years, recent_losses))
    sum_x2 = sum(x*x for x in recent_years)
    
    # Linear regression: y = mx + b
    if (n * sum_x2 - sum_x * sum_x) != 0:
        slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x * sum_x)
        intercept = (sum_y - slope * sum_x) / n
        
        # Project using trend
        last_year = max(recent_years)
        projected_loss = slope * target_year + intercept
        
        # Ensure reasonable bounds (no negative loss, max 5% of forest per year)
        max_annual_loss = forest_area * 0.05
        projected_loss = max(0, min(projected_loss, max_annual_loss))
        
        return {
            "method": "linear_trend",
            "annual_loss_ha": projected_loss,
            "trend_slope": slope,
            "description": f"Linear trend from {n} recent years ({'increasing' if slope > 0 else 'decreasing'} at {abs(slope):.0f} ha/year²)"
        }
    else:
        # Fallback to average
        avg_loss = sum(recent_losses) / len(recent_losses)
        return {
            "method": "recent_average",
            "annual_loss_ha": avg_loss,
            "description": f"Average of last {len(recent_losses)} years"
        }


def create_user_scenario_projection(historical: List[Dict], target_year: int, loss_fraction: float, forest_area: float, country_iso: str) -> Dict[str, Any]:
    """Create user's hypothetical scenario projection."""
    
    last_year = max(r["year"] for r in historical)
    years_to_target = target_year - last_year
    
    if years_to_target <= 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Target year {target_year} must be after last historical year {last_year}"
        )

    # User's target: specific percentage by target year
    user_total_loss = forest_area * loss_fraction
    
    # Country-specific projection parameters for realism bounds
    country_params = {
        "BRA": {"max_growth_rate": 0.3, "volatility": "high"},
        "IDN": {"max_growth_rate": 0.25, "volatility": "high"}, 
        "PAK": {"max_growth_rate": 0.2, "volatility": "low"},
        "IND": {"max_growth_rate": 0.15, "volatility": "medium"},
        "GBR": {"max_growth_rate": 0.1, "volatility": "very_low"},
        "USA": {"max_growth_rate": 0.1, "volatility": "low"},
    }
    
    params = country_params.get(country_iso, {"max_growth_rate": 0.2, "volatility": "medium"})
    
    # Calculate recent baseline
    recent_losses = [r["loss_ha"] for r in historical[-3:]]
    recent_avg = sum(recent_losses) / len(recent_losses)
    
    # Distribute loss across years - could be linear or accelerating
    projected_timeline = []
    
    if loss_fraction <= 0.02:  # <= 2% - gradual increase
        # Linear distribution
        annual_loss = user_total_loss / years_to_target
        for i in range(1, years_to_target + 1):
            projected_timeline.append({
                "year": last_year + i,
                "loss_ha": annual_loss,
                "type": "projected_user_scenario"
            })
    else:  # > 2% - accelerating scenario
        # Accelerating pattern - starts closer to recent average, accelerates toward target
        total_distributed = 0
        for i in range(1, years_to_target + 1):
            # Acceleration factor increases over time
            acceleration = (i / years_to_target) ** 1.5
            base_loss = recent_avg * (1 + acceleration * 3)  # Up to 4x recent average
            
            # Ensure we hit the total target by final year
            if i == years_to_target:
                final_loss = user_total_loss - total_distributed
                base_loss = max(base_loss, final_loss)
            
            projected_timeline.append({
                "year": last_year + i,
                "loss_ha": base_loss,
                "type": "projected_user_scenario"
            })
            total_distributed += base_loss
    
    return {
        "method": "user_scenario",
        "target_loss_fraction": loss_fraction,
        "target_loss_percentage": loss_fraction * 100,
        "total_target_loss_ha": user_total_loss,
        "years_to_target": years_to_target,
        "projection_timeline": projected_timeline,
        "parameters_used": params,
        "description": f"Hypothetical {loss_fraction*100:.1f}% forest loss by {target_year}"
    }


def create_trend_projection_timeline(trend_data: Dict, historical: List[Dict], target_year: int) -> List[Dict]:
    """Create timeline for trend-based projection."""
    
    last_year = max(r["year"] for r in historical)
    timeline = []
    
    for year in range(last_year + 1, target_year + 1):
        timeline.append({
            "year": year,
            "loss_ha": trend_data["annual_loss_ha"],
            "type": "projected_trend_based"
        })
    
    return timeline


def simulate_forest_loss_dual(country_iso: str, loss_fraction: float, target_year: int) -> dict:
    """
    Enhanced simulation with both user scenario and trend-based projections.
    """
    
    # 1. Get country data
    country_info = get_geostore(country_iso)
    geometry = country_info["attributes"]["geojson"]["features"][0]["geometry"]
    geostore_id = country_info["id"]
    area_ha = country_info["attributes"]["areaHa"]
    country_name = country_info["attributes"]["info"]["name"]

    # 2. Get baseline data
    forest_area = get_forest_area(geometry)
    emissions = get_carbon_emissions(geometry)

    # 3. Get historical loss data
    historical = get_historical_loss(geostore_id)

    # 4. Calculate both projections
    user_scenario = create_user_scenario_projection(historical, target_year, loss_fraction, forest_area, country_iso)
    trend_projection = calculate_trend_projection(historical, target_year, forest_area)
    trend_timeline = create_trend_projection_timeline(trend_projection, historical, target_year)
    
    # 5. Build combined timeseries
    combined_timeseries = []
    
    # Add historical data
    for record in historical:
        combined_timeseries.append({
            "year": record["year"],
            "loss_ha": record["loss_ha"],
            "type": "observed"
        })
    
    # Add user scenario projections
    combined_timeseries.extend(user_scenario["projection_timeline"])
    
    # 6. Calculate totals and comparisons
    user_total_loss = sum(p["loss_ha"] for p in user_scenario["projection_timeline"])
    trend_total_loss = sum(p["loss_ha"] for p in trend_timeline)
    
    # Historical context
    recent_avg = sum(r["loss_ha"] for r in historical[-5:]) / min(5, len(historical))
    historical_total = sum(r["loss_ha"] for r in historical)
    
    # Carbon calculations
    emissions_per_ha = emissions / forest_area if forest_area > 0 else 0
    
    user_co2_impact = user_total_loss * emissions_per_ha
    trend_co2_impact = trend_total_loss * emissions_per_ha
    
    return {
        "country": country_name,
        "country_iso": country_iso,
        "total_area_ha": area_ha,
        "forest_area_ha": forest_area,
        "baseline_emissions_Mg_CO2e": emissions,
        "geometry": geometry,
        "analysis_period": {
            "historical_years": f"{min(r['year'] for r in historical)}-{max(r['year'] for r in historical)}",
            "projection_target_year": target_year,
            "years_projected": target_year - max(r['year'] for r in historical)
        },
        "projections": {
            "user_scenario": {
                "description": user_scenario["description"],
                "method": user_scenario["method"],
                "total_loss_ha": user_total_loss,
                "total_co2_tons": user_co2_impact / 1000,  # Convert Mg to tons
                "avg_annual_loss_ha": user_total_loss / user_scenario["years_to_target"],
                "timeline": user_scenario["projection_timeline"]
            },
            "trend_based": {
                "description": trend_projection["description"],
                "method": trend_projection["method"],
                "total_loss_ha": trend_total_loss,
                "total_co2_tons": trend_co2_impact / 1000,
                "avg_annual_loss_ha": trend_projection["annual_loss_ha"],
                "timeline": trend_timeline
            }
        },
        "comparison": {
            "user_vs_trend_multiplier": round(user_total_loss / trend_total_loss, 1) if trend_total_loss > 0 else "infinite",
            "user_vs_recent_avg_multiplier": round((user_total_loss / user_scenario["years_to_target"]) / recent_avg, 1) if recent_avg > 0 else "infinite",
            "scenario_realism": "hypothetical" if loss_fraction > 0.05 else "aggressive" if loss_fraction > 0.02 else "plausible",
            "context": f"Historical average: {recent_avg:,.0f} ha/year. User scenario: {user_total_loss/user_scenario['years_to_target']:,.0f} ha/year.",
        },
        "combined_timeseries": combined_timeseries,
        "summary": {
            "historical_records": len(historical),
            "historical_total_loss_ha": historical_total,
            "scenario_type": "dual_projection_analysis",
            "recommendation": "Compare both projections to understand the difference between your hypothetical scenario and continuation of current trends."
        }
    }


# ========================
# API Routes
# ========================
@router.post("/simulate/")
def run_simulation(req: SimulationRequest):
    """Run enhanced forest loss simulation with dual projections."""
    try:
        # Import here to avoid circular dependency
        from app.utils.country_lookup import COUNTRY_NAME_TO_ISO3
        
        # Simple country resolution
        country_input = req.country.lower().strip()
        country_iso = COUNTRY_NAME_TO_ISO3.get(country_input)
        
        if not country_iso:
            # Try uppercase for ISO codes
            if len(req.country) == 3:
                country_iso = req.country.upper()
            else:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Country '{req.country}' not found. Check /countries endpoint for supported countries."
                )
        
        return simulate_forest_loss_dual(
            country_iso, 
            req.forest_loss_percent / 100, 
            req.target_year
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")


@router.get("/countries")
def get_supported_countries():
    """Get list of supported countries."""
    try:
        from app.utils.country_lookup import COUNTRY_NAME_TO_ISO3
        
        countries = []
        seen_codes = set()
        
        for name, code in COUNTRY_NAME_TO_ISO3.items():
            if code not in seen_codes and len(name) > 3:
                countries.append({"name": name.title(), "iso3_code": code})
                seen_codes.add(code)
        
        countries.sort(key=lambda x: x["name"])
        
        return {
            "total_countries": len(countries),
            "countries": countries[:50],  # Limit response size
            "usage": "Use country name or ISO3 code in simulation requests"
        }
        
    except Exception as e:
        return {"error": f"Failed to load countries: {str(e)}"}


@router.get("/health")
def health_check():
    """Check if GFW API is accessible."""
    try:
        url = f"{BASE_URL}/datasets"
        resp = requests.get(url, headers=HEADERS, timeout=10)
        return {
            "status": "healthy" if resp.status_code == 200 else "unhealthy",
            "gfw_api_status": resp.status_code,
            "message": "GFW API connection successful" if resp.status_code == 200 else "GFW API connection failed"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "message": "Cannot connect to GFW API"
        }