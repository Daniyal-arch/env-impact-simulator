import numpy as np
from typing import List, Dict, Optional
from app.services.data_fetch import get_tree_cover_timeseries

CARBON_FACTORS = {"BRA": 180, "PAK": 80, "IDN": 200}  # Example defaults
DEFAULT_FOREST_COVER_FRACTION = 0.30
DEFAULT_CARBON_FACTOR = 150.0

def baseline_projection(years: List[int], loss_values: List[float], predict_years: List[int]) -> Dict[int, float]:
    """Fit linear trend to historic values and project into the future."""
    if not years or not loss_values or len(years) < 2:
        last = loss_values[-1] if loss_values else 0.0
        return {y: float(last) for y in predict_years}
    coeffs = np.polyfit(years, loss_values, 1)
    slope, intercept = coeffs
    return {y: float(max(slope*y + intercept, 0.0)) for y in predict_years}

def simulate_scenario(country_iso: str, percent_loss: float, target_year: int, method: str="linear") -> Dict:
    hist = get_tree_cover_timeseries(country_iso)
    area_ha = hist.get("area_ha", 0.0)
    timeseries = hist.get("timeseries", [])
    current_forest_area = area_ha * DEFAULT_FOREST_COVER_FRACTION

    years = [r["year"] for r in timeseries]
    losses = [r["loss_ha"] for r in timeseries]
    last_known_year = years[-1] if years else 2000
    predict_years = list(range(2001, target_year+1))
    baseline = baseline_projection(years, losses, predict_years)

    total_loss_required = percent_loss * current_forest_area
    baseline_future_sum = sum(baseline.get(y, 0.0) for y in range(last_known_year+1, target_year+1))
    total_extra = max(0.0, total_loss_required - baseline_future_sum)

    cf = CARBON_FACTORS.get(country_iso.upper(), DEFAULT_CARBON_FACTOR)

    combined = []
    for r in timeseries:
        combined.append({"year": r["year"], "loss_ha": r["loss_ha"], "co2_tons": r["loss_ha"]*cf, "type": "observed"})
    for y in range(last_known_year+1, target_year+1):
        loss = baseline.get(y, 0.0) + total_extra/len(range(last_known_year+1, target_year+1))
        combined.append({"year": y, "loss_ha": loss, "co2_tons": loss*cf, "type": "projected"})

    return {
        "iso3": country_iso,
        "area_ha": area_ha,
        "carbon_factor": cf,
        "target_year": target_year,
        "percent_loss_target": percent_loss,
        "combined_timeseries": combined,
        "total_loss_ha": sum(x["loss_ha"] for x in combined),
        "total_co2_tons": sum(x["co2_tons"] for x in combined),
    }
