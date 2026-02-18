import requests

def test_api():
    base_url = "http://127.0.0.1:5000/api"
    
    # Test 1: Get all recipes (first page)
    print("Testing GET /api/recipes...")
    try:
        response = requests.get(f"{base_url}/recipes")
        response.raise_for_status()
        data = response.json()
        print(f"Success! Status: {response.status_code}")
        print(f"Total recipes: {data.get('total', 'N/A')}")
        print(f"Page: {data.get('page', 'N/A')}")
        if data.get('data'):
            print(f"Sample recipe: {data['data'][0]['title']}")
    except Exception as e:
        print(f"Failed: {e}")

    # Test 2: Pagination
    print("\nTesting Pagination (Page 2, Limit 5)...")
    try:
        response = requests.get(f"{base_url}/recipes", params={"page": 2, "limit": 5})
        response.raise_for_status()
        data = response.json()
        print(f"Success! Status: {response.status_code}")
        print(f"Page: {data.get('page', 'N/A')}")
        print(f"Recipes in page: {len(data.get('data', []))}")
    except Exception as e:
        print(f"Failed: {e}")

    # Test 3: Search
    print("\nTesting Search (Query='Pie')...")
    try:
        response = requests.get(f"{base_url}/recipes/search", params={"query": "Pie"})
        response.raise_for_status()
        data = response.json()
        print(f"Success! Status: {response.status_code}")
        print(f"Found {len(data['data'])} results for 'Pie'")
        if data['data']:
             print(f"First result: {data['data'][0]['title']}")
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    test_api()
