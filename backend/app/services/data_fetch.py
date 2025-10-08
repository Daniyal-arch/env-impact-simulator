"""
Enhanced GFW Data Fetching - ONLY WORKING DATASETS
Tested and verified in Google Colab
"""

import requests
from typing import Dict, Any, List
import os
from dotenv import load_dotenv

load_dotenv()

GFW_API_KEY = os.getenv("GFW_API_KEY")
BASE_URL = "https://data-api.globalforestwatch.org"
HEADERS = {"x-api-key": GFW_API_KEY, "Content-Type": "application/json"}


def get_tree_cover_gain(geostore_id: str) -> Dict[str, Any]:
    """Get tree cover gain data (2000-2020). WORKING ✓"""
    dataset = "umd_tree_cover_gain"
    version = "v202206"
    url = f"{BASE_URL}/dataset/{dataset}/{version}/query/json"
    
    sql = """
    SELECT SUM(area__ha) as gain_ha
    FROM results
    """.strip()
    
    params = {"sql": sql, "geostore_id": geostore_id}
    
    try:
        resp = requests.get(url, headers=HEADERS, params=params, timeout=60)
        
        if resp.status_code == 200:
            data = resp.json().get("data", [])
            if data and data[0].get("gain_ha"):
                total_gain = float(data[0]["gain_ha"])
                return {
                    "total_gain_ha": total_gain,
                    "period": "2000-2020",
                    "status": "success"
                }
        
        return {
            "total_gain_ha": 0,
            "period": "2000-2020",
            "status": "no_data",
            "error": f"Status {resp.status_code}"
        }
    except Exception as e:
        return {
            "total_gain_ha": 0,
            "period": "2000-2020",
            "status": "error",
            "error": str(e)
        }


def get_fire_alerts(geostore_id: str, start_year: int = 2020) -> Dict[str, Any]:
    """Get fire alerts from NASA VIIRS. WORKING ✓"""
    dataset = "nasa_viirs_fire_alerts"
    version = "v20241209"
    url = f"{BASE_URL}/dataset/{dataset}/{version}/query/json"
    
    sql = f"""
    SELECT COUNT(*) as alert_count
    FROM results
    WHERE alert__date >= '{start_year}-01-01'
    """.strip()
    
    params = {"sql": sql, "geostore_id": geostore_id}
    
    try:
        resp = requests.get(url, headers=HEADERS, params=params, timeout=60)
        
        if resp.status_code == 200:
            data = resp.json().get("data", [])
            if data:
                count = int(data[0].get("alert_count", 0))
                return {
                    "total_alerts": count,
                    "period": f"{start_year}-2024",
                    "status": "success"
                }
        
        return {
            "total_alerts": 0,
            "period": f"{start_year}-2024",
            "status": "no_data",
            "error": f"Status {resp.status_code}"
        }
    except Exception as e:
        return {
            "total_alerts": 0,
            "period": f"{start_year}-2024",
            "status": "error",
            "error": str(e)
        }


def get_protected_areas_info(geostore_id: str) -> Dict[str, Any]:
    """Get protected areas breakdown by IUCN category. WORKING ✓"""
    dataset = "wdpa_protected_areas"
    version = "v202102"
    url = f"{BASE_URL}/dataset/{dataset}/{version}/query/json"
    
    sql = """
    SELECT 
        iucn_cat as category,
        COUNT(*) as area_count,
        SUM(gis_m_area) as total_area_ha
    FROM results
    WHERE iucn_cat IS NOT NULL
    GROUP BY iucn_cat
    ORDER BY total_area_ha DESC
    """.strip()
    
    params = {"sql": sql, "geostore_id": geostore_id}
    
    try:
        resp = requests.get(url, headers=HEADERS, params=params, timeout=60)
        
        if resp.status_code == 200:
            data = resp.json().get("data", [])
            if data:
                categories = []
                total_protected = 0
                
                for record in data:
                    cat = record.get("category", "Unknown")
                    count = int(record.get("area_count", 0))
                    area = float(record.get("total_area_ha", 0))
                    
                    categories.append({
                        "category": cat,
                        "count": count,
                        "area_ha": area
                    })
                    total_protected += area
                
                return {
                    "categories": categories,
                    "total_protected_ha": total_protected,
                    "total_categories": len(categories),
                    "status": "success"
                }
        
        return {
            "categories": [],
            "total_protected_ha": 0,
            "total_categories": 0,
            "status": "no_data",
            "error": f"Status {resp.status_code}"
        }
    except Exception as e:
        return {
            "categories": [],
            "total_protected_ha": 0,
            "total_categories": 0,
            "status": "error",
            "error": str(e)
        }


def get_primary_forest_extent(geometry: dict) -> Dict[str, Any]:
    """Get primary forest extent using high canopy density. WORKING ✓"""
    dataset = "umd_tree_cover_density_2000"
    version = "v1.6"
    url = f"{BASE_URL}/dataset/{dataset}/{version}/query/json"
    
    sql = """
    SELECT SUM(area__ha) as primary_ha
    FROM results
    WHERE umd_tree_cover_density_2000__threshold >= 75
    """.strip()
    
    payload = {"sql": sql, "geometry": geometry}
    
    try:
        resp = requests.post(url, headers=HEADERS, json=payload, timeout=60)
        
        if resp.status_code == 200:
            data = resp.json().get("data", [])
            if data and data[0].get("primary_ha"):
                primary = float(data[0]["primary_ha"])
                return {
                    "primary_forest_ha": primary,
                    "threshold": ">=75% canopy density",
                    "status": "success"
                }
        
        return {
            "primary_forest_ha": 0,
            "threshold": ">=75% canopy density",
            "status": "no_data",
            "error": f"Status {resp.status_code}"
        }
    except Exception as e:
        return {
            "primary_forest_ha": 0,
            "threshold": ">=75% canopy density",
            "status": "error",
            "error": str(e)
        }


def get_comprehensive_forest_data(country_iso: str, geostore_id: str, geometry: dict) -> Dict[str, Any]:
    """
    Fetch ALL verified working datasets for a country.
    """
    
    print(f"\n📊 Fetching comprehensive data for {country_iso}...")
    print(f"Geostore ID: {geostore_id}\n")
    
    results = {
        "country_iso": country_iso,
        "geostore_id": geostore_id,
        "datasets_queried": 4
    }
    
    # 1. Tree cover gain
    print("1/4 Fetching tree cover gain...")
    results["tree_cover_gain"] = get_tree_cover_gain(geostore_id)
    status = "✓" if results["tree_cover_gain"]["status"] == "success" else "✗"
    print(f"    {status} Tree cover gain")
    
    # 2. Fire alerts
    print("2/4 Fetching fire alerts...")
    results["fire_alerts"] = get_fire_alerts(geostore_id, start_year=2020)
    status = "✓" if results["fire_alerts"]["status"] == "success" else "✗"
    print(f"    {status} Fire alerts")
    
    # 3. Protected areas
    print("3/4 Fetching protected areas...")
    results["protected_areas"] = get_protected_areas_info(geostore_id)
    status = "✓" if results["protected_areas"]["status"] == "success" else "✗"
    print(f"    {status} Protected areas")
    
    # 4. Primary forest extent
    print("4/4 Fetching primary forest extent...")
    results["primary_forest"] = get_primary_forest_extent(geometry)
    status = "✓" if results["primary_forest"]["status"] == "success" else "✗"
    print(f"    {status} Primary forest extent")
    
    print(f"\n✅ Completed fetching data for {country_iso}\n")
    
    return results


# For testing
if __name__ == "__main__":
    print("Testing GFW Enhanced Data Fetching")
    print("="*60)
    
    # You need geostore_id and geometry for testing
    # Get these from get_geostore() first