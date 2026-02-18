from api import app, db, Recipe

with app.app_context():
    total = Recipe.query.count()
    print(f"Total: {total}")
    
    print("Querying page 1, limit 5...")
    page1 = Recipe.query.order_by(Recipe.rating.desc()).paginate(page=1, per_page=5, error_out=False).items
    print(f"Page 1 items: {len(page1)}")
    for p in page1:
        print(f" - {p.title} ({p.rating})")

    print("Querying page 2, limit 5...")
    page2 = Recipe.query.order_by(Recipe.rating.desc()).paginate(page=2, per_page=5, error_out=False).items
    print(f"Page 2 items: {len(page2)}")
    for p in page2:
        print(f" - {p.title} ({p.rating})")
