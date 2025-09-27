import requests
from app.core.config import settings

HEADERS = {
    "x-api-key": settings.GFW_API_KEY,
    "Content-Type": "application/json"
}

def get_country_geostore(country_iso: str):
    """Fetch geostore ID & area for a given country."""
    url = f"{settings.BASE_URL}/geostore/admin/{country_iso}"
    print(f"🌍 Fetching geostore for {country_iso} -> {url}")

    resp = requests.get(url, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    return {
        "geostore_id": data["data"]["id"],
        "area_ha": data["data"]["attributes"]["areaHa"]
    }

def get_tree_cover_timeseries(country_iso: str):
    """Fetch tree cover loss timeseries for a country using GFW SQL API."""
    geo = get_country_geostore(country_iso)
    dataset = "umd_tree_cover_loss"
    version = "v1.9"

    sql = """
        SELECT umd_tree_cover_loss__year, SUM(area__ha) as loss_ha
        FROM results
        GROUP BY umd_tree_cover_loss__year
        ORDER BY umd_tree_cover_loss__year
    """.strip()

    query_url = f"{settings.BASE_URL}/dataset/{dataset}/{version}/query/json"

    params = {
        "sql": sql,
        "geostore_id": geo["geostore_id"]  # ✅ Using query param (like Colab)
    }

    print(f"🌍 Query URL: {query_url}")
    print(f"🔑 Using geostore_id={geo['geostore_id']}")
    print(f"📦 Params: {params}")

    # ✅ Use GET request (same as your working Colab code)
    resp = requests.get(query_url, headers=HEADERS, params=params, timeout=20)

    print(f"🔎 Response Status: {resp.status_code}")
    if resp.status_code != 200:
        print(f"❌ GFW API Query failed with {resp.status_code}: {resp.text[:300]}")
    resp.raise_for_status()

    result = resp.json()

    timeseries = []
    for r in result.get("data", []):
        year = r.get("umd_tree_cover_loss__year")
        if year:
            timeseries.append({"year": int(year), "loss_ha": float(r.get("loss_ha", 0.0))})

    return {"iso3": country_iso, "area_ha": geo["area_ha"], "timeseries": timeseries}
