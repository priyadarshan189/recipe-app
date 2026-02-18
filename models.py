from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Recipe(db.Model):
    __tablename__ = 'recipes'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String, nullable=True) # Partial match
    url = db.Column(db.String, nullable=True) # Original URL
    cuisine = db.Column(db.String, nullable=True) # Exact filter
    rating = db.Column(db.Float, nullable=True) # Sort/Filter
    total_time = db.Column(db.Integer, nullable=True) # Filter (minutes)
    prep_time = db.Column(db.Integer, nullable=True)
    cook_time = db.Column(db.Integer, nullable=True)
    description = db.Column(db.Text, nullable=True)
    ingredients = db.Column(db.JSON, nullable=True) # Store as JSON
    instructions = db.Column(db.JSON, nullable=True) # Store as JSON
    nutrients = db.Column(db.JSON, nullable=True) # Store as JSON
    serves = db.Column(db.String, nullable=True) # e.g. "8 servings"
    calories = db.Column(db.Float, nullable=True) # Extracted from nutrients for easier filtering? Or filter on JSON?
    # Requirements say "Filter by calories". Querying JSON in SQLite is possible but extracting to a column is faster and standard.
    # Let's extract calories to a column during parsing.

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'cuisine': self.cuisine,
            'rating': self.rating,
            'total_time': self.total_time,
            'prep_time': self.prep_time,
            'cook_time': self.cook_time,
            'description': self.description,
            'ingredients': self.ingredients,
            'instructions': self.instructions,
            'nutrients': self.nutrients,
            'serves': self.serves,
            'serves': self.serves,
            'calories': self.calories,
            'url': self.url
        }
