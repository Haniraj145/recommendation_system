from flask import Flask, request, jsonify
import pandas as pd
from sklearn.cluster import KMeans
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Load dataset
data = pd.read_csv("cleaned_retail.csv")

# Pivot table for customers vs products
customer_product = data.pivot_table(
    index='Customer ID',
    columns='Description',
    values='Quantity',
    aggfunc='sum'
).fillna(0)

# 🔹 Customer summary for clustering
customer_summary = data.groupby('Customer ID').agg({
    'Quantity': 'sum',
    'Price': 'mean'
}).reset_index()

# 🔹 K-Means clustering
kmeans = KMeans(n_clusters=4, random_state=42)
customer_summary['Cluster'] = kmeans.fit_predict(customer_summary[['Quantity', 'Price']])

# 🔹 Category inference
def infer_category(desc):
    desc = desc.lower()
    if "lantern" in desc or "candle" in desc:
        return "Home Decor"
    elif "toy" in desc or "game" in desc:
        return "Toys"
    elif "mug" in desc or "cup" in desc or "plate" in desc:
        return "Kitchen"
    else:
        return "General"

@app.route('/')
def home():
    return "Welcome to the Retail Recommendation API!"

@app.route('/recommend', methods=['GET'])
def recommend():
    user = request.args.get('user')
    country = request.args.get('country')

    if not user:
        return jsonify({'error': 'Customer ID required'})

    user = int(user)
    filtered_data = data
    if country:
        filtered_data = filtered_data[filtered_data['Country'].str.lower() == country.lower()]

    if user not in customer_summary['Customer ID'].values:
        return jsonify({'recommended_products': []})

    # 🔹 Get user cluster
    user_cluster = customer_summary.loc[customer_summary['Customer ID'] == user, 'Cluster'].values[0]
    similar_customers = customer_summary[customer_summary['Cluster'] == user_cluster]['Customer ID']

    recommended_items = (
        filtered_data[filtered_data['Customer ID'].isin(similar_customers)]
        .assign(weight=lambda x: x['Quantity'] * x['Price'])
        .groupby(['Description', 'Price'])
        .agg({'Quantity': 'sum', 'weight': 'sum'})
        .sort_values('weight', ascending=False)
        .head(15)
        .reset_index()
    )

    results = [
        {
            'product': row['Description'],
            'price': row['Price'],
            'quantity': int(row['Quantity']),
            'category': infer_category(row['Description']),
            'popularity': round(row['Quantity'] * row['Price'], 2),
            'cluster': int(user_cluster)
        }
        for _, row in recommended_items.iterrows()
    ]

    # 🔹 User history
    user_history = data[data['Customer ID'] == user][['Description', 'Quantity', 'Price']].head(10).to_dict(orient='records')

    return jsonify({'recommended_products': results, 'history': user_history})

if __name__ == "__main__":
    app.run(debug=True)
