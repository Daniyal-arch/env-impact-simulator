from pydantic import BaseModel
from typing import List, Optional

class YearRecord(BaseModel):
    year: int
    loss_ha: float
    co2_tons: Optional[float] = None
    type: Optional[str] = "observed"

class SimulationRequest(BaseModel):
    country: str
    forest_loss_percent: float
    target_year: int

class SimulationResponse(BaseModel):
    iso3: str
    area_ha: Optional[float]
    carbon_factor: Optional[float]
    target_year: int
    percent_loss_target: float
    combined_timeseries: List[YearRecord]
    total_loss_ha: float
    total_co2_tons: float
