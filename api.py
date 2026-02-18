from flask import Flask, jsonify, request, send_from_directory
from models import db, Recipe
import os

app = Flask(__name__, static_folder='static')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///recipes.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('static', path)

@app.route('/api/recipes', methods=['GET'])
def get_recipes():
    """
    Get all recipes with pagination and sorting.
    Query Params:
        page: int (default 1)
        limit: int (default 15, max 50)
    """
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 15, type=int)
    
    # Enforce limit constraints
    if limit < 1: limit = 15
    if limit > 50: limit = 50

    # Sort by rating descending
    query = Recipe.query.order_by(Recipe.rating.desc())
    
    pagination = query.paginate(page=page, per_page=limit, error_out=False)
    
    return jsonify({
        'data': [r.to_dict() for r in pagination.items],
        'page': page,
        'limit': limit,
        'total': pagination.total,
        'pages': pagination.pages
    })

@app.route('/api/recipes/search', methods=['GET'])
def search_recipes():
    """
    Search recipes with filters.
    Query Params:
        title: str (partial match)
        cuisine: str (exact match)
        calories: float (<= value) - Requirement says "Filter by calories", usually means max calories.
                    Let's assume "calories" param acts as max_calories for health filtering, 
                    or exact match? 
                    Screenshot 3 says: `calories: Filter by calories (greater than, less than, equals to a specific value)`. 
                    Wait, `calories` key in param usually implies exact, but screenshots often imply ranges.
                    Let's look closely at screenshot 3.
                    "calories: Filter by calories (greater than, less than, or equal to a specific value)."
                    "Example Request: /api/recipes/search?calories=<400&title=pie&rating=>=4.5"
                    Ah, it supports operators in the value! like `<400`, `>=4.5`.
    """
    query = Recipe.query

    # Helper to parse operator and value
    def parse_op(str_val):
        """Returns (op, value) where op is 'eq', 'gt', 'lt', 'gte', 'lte'."""
        if not str_val: return None, None
        
        # Regex for operators
        match = re.match(r'(>=|<=|>|<|=)?\s*(\d+(\.\d+)?)', str_val)
        if match:
            op = match.group(1)
            val = float(match.group(2))
            return op, val
        return None, None

    import re

    title = request.args.get('title')
    if title:
        query = query.filter(Recipe.title.ilike(f'%{title}%'))

    cuisine = request.args.get('cuisine')
    if cuisine:
        query = query.filter(Recipe.cuisine == cuisine)

    # Complex filters
    for field in ['calories', 'rating', 'total_time']: # total_time matches 'current_time' requirement? Requirement says "total_time".
        val_str = request.args.get(field)
        if val_str:
            op, val = parse_op(val_str)
            if val is not None:
                column = getattr(Recipe, field)
                if op == '>': query = query.filter(column > val)
                elif op == '<': query = query.filter(column < val)
                elif op == '>=': query = query.filter(column >= val)
                elif op == '<=': query = query.filter(column <= val)
                else: query = query.filter(column == val) # Default to equal or '='

    # Pagination for search too? Requirement says "Search API". Usually implies list. 
    # Requirement 3 says "Add Field (Cell) level filter and use Search API".
    # Requirement 4 says "Also, handle pagination...". 
    # It seems Search might also need pagination or it returns all? 
    # Let's add pagination to search as well for consistency, default 15.
    
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 15, type=int)
    if limit > 50: limit = 50

    pagination = query.paginate(page=page, per_page=limit, error_out=False)

    return jsonify({
        'data': [r.to_dict() for r in pagination.items],
        'page': page,
        'limit': limit,
        'total': pagination.total,
        'pages': pagination.pages
    })

@app.route('/api/cuisines', methods=['GET'])
def get_cuisines():
    """Get list of unique cuisines"""
    cuisines = db.session.query(Recipe.cuisine).distinct().order_by(Recipe.cuisine).all()
    # cuisines is a list of tuples like [('American',), ('Italian',)]
    return jsonify([c[0] for c in cuisines if c[0]])

if __name__ == '__main__':
    # Ensure DB exists
    with app.app_context():
        db.create_all()
    app.run(debug=True)
