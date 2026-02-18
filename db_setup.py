import json
from flask import Flask
from models import db, Recipe
import re

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///recipes.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

def clean_val(val):
    """Convert 'NaN' string to None."""
    if isinstance(val, str) and val.lower() == 'nan':
        return None
    return val

def parse_calories(nutrients):
    """Extract numeric calories from string like '389 kcal'."""
    if not nutrients or not isinstance(nutrients, dict):
        return None
    cal_str = nutrients.get('calories')
    if not cal_str:
        return None
    
    # Use regex to find the first number (integer or float)
    match = re.search(r"(\d+(\.\d+)?)", str(cal_str))
    if match:
        return float(match.group(1))
    return None

def seed_database():
    with app.app_context():
        print("Dropping existing tables...")
        db.drop_all()
        print("Creating database tables...")
        db.create_all()
        
        # Removed check for existing data to force re-seed
        # if Recipe.query.first():
        #     print("Database already contains data. Skipping seed.")
        #     return

        print("Loading data from JSON...")
        try:
            with open('Copy of US_recipes_null.json', 'r', encoding='utf-8') as f:
                data = json.load(f)
        except FileNotFoundError:
            print("Error: Copy of US_recipes_null.json not found.")
            return

        print(f"Found {len(data)} recipes. Processing...")
        count = 0
        # Data could be a list or a dict of dicts (based on file inspection)
        if isinstance(data, dict):
            print("Detected dictionary structure. Converting values to list...")
            data_items = data.values()
        elif isinstance(data, list):
            data_items = data
        else:
            print(f"Error: Unknown data structure (Type: {type(data)})")
            return

        for i, item in enumerate(data_items):
            if not isinstance(item, dict):
                print(f"Skipping item {i}: Not a dictionary (Type: {type(item)})")
                continue
                
            try:
                # Extract and clean fields
                title = clean_val(item.get('title'))
                cuisine = clean_val(item.get('cuisine'))
                url = clean_val(item.get('URL'))
                rating = clean_val(item.get('rating'))
                
                # Handle timestamps which might be "NaN" or numbers
                total_time = clean_val(item.get('total_time'))
                prep_time = clean_val(item.get('prep_time'))
                cook_time = clean_val(item.get('cook_time'))
                
                description = clean_val(item.get('description'))
                ingredients = item.get('ingredients', [])
                instructions = item.get('instructions', [])
                nutrients = item.get('nutrients', {})
                serves = clean_val(item.get('serves'))
                
                calories = parse_calories(nutrients)

                recipe = Recipe(
                    title=title,
                    cuisine=cuisine,
                    url=url,
                    rating=rating,
                    total_time=total_time,
                    prep_time=prep_time,
                    cook_time=cook_time,
                    description=description,
                    ingredients=ingredients,
                    instructions=instructions,
                    nutrients=nutrients,
                    serves=serves,
                    calories=calories
                )
                db.session.add(recipe)
                count += 1
            except Exception as e:
                print(f"Error processing item {i}: {e}")

        db.session.commit()
        print(f"Successfully added {count} recipes to the database.")

if __name__ == '__main__':
    seed_database()
