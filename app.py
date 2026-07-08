from flask import Flask, request, jsonify
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ==============================
# Load Dataset
# ==============================

data = pd.read_csv("cleaned_retail.csv")

# Remove any leading/trailing spaces from column names
data.columns = data.columns.str.strip()

# Rename columns so the rest of the code works unchanged
data.rename(columns={
    "CustomerID": "Customer ID"
}, inplace=True)

print(data.columns)

# ==============================
# Customer Product Matrix
# ==============================

customer_product = data.pivot_table(
    index="Customer ID",
    columns="Description",
    values="Quantity",
    aggfunc="sum"
).fillna(0)

# ==============================
# Customer Summary
# ==============================
customer_summary = data.groupby("Customer ID").agg({
    "Quantity": "sum",
    "Price": "mean",
    "TotalAmount": "sum"
}).reset_index()

# ==============================
# Feature Scaling (fix: K-Means uses Euclidean distance, so
# Quantity and Price must be on the same scale or Quantity
# will dominate the clustering)
# ==============================

scaler = StandardScaler()
scaled_features = scaler.fit_transform(
    customer_summary[["Quantity", "Price"]]
)

# ==============================
# K-Means Clustering
# ==============================

K = 4

kmeans = KMeans(
    n_clusters=K,
    random_state=42,
    n_init=10
)

customer_summary["Cluster"] = kmeans.fit_predict(scaled_features)

# ==============================
# Cluster Characteristics
# (computed once, used to explain *why* a customer landed
# in a given cluster - average / min / max Quantity and Price
# per cluster, based on the raw, unscaled values so it's
# human-readable on the frontend)
# ==============================

cluster_stats_df = (
    customer_summary
    .groupby("Cluster")
    .agg(
        avg_quantity=("Quantity", "mean"),
        min_quantity=("Quantity", "min"),
        max_quantity=("Quantity", "max"),
        avg_price=("Price", "mean"),
        min_price=("Price", "min"),
        max_price=("Price", "max"),
        customer_count=("Customer ID", "count")
    )
    .reset_index()
)

cluster_stats = []

for _, row in cluster_stats_df.iterrows():
    cluster_stats.append({
        "cluster": int(row["Cluster"]),
        "avg_quantity": round(float(row["avg_quantity"]), 2),
        "min_quantity": int(row["min_quantity"]),
        "max_quantity": int(row["max_quantity"]),
        "avg_price": round(float(row["avg_price"]), 2),
        "min_price": round(float(row["min_price"]), 2),
        "max_price": round(float(row["max_price"]), 2),
        "customer_count": int(row["customer_count"])
    })

# ==============================
# Category Inference
# ==============================

def infer_category(description):

    desc = str(description).lower()

    if "lantern" in desc or "candle" in desc:
        return "Home Decor"

    elif "toy" in desc or "game" in desc:
        return "Toys"

    elif "mug" in desc or "cup" in desc or "plate" in desc:
        return "Kitchen"

    elif "bag" in desc:
        return "Accessories"

    elif "box" in desc:
        return "Storage"

    else:
        return "General"


# ==============================
# Home
# ==============================

@app.route("/")
def home():
    return "Retail Recommendation API is Running."


# ==============================
# Recommendation API
# ==============================

@app.route("/recommend", methods=["GET"])
def recommend():

    user = request.args.get("user")
    country = request.args.get("country")

    if not user:
        return jsonify({
            "error": "Customer ID required"
        })

    user = int(user)

    filtered_data = data

    if country:
        filtered_data = filtered_data[
            filtered_data["Country"].str.lower() == country.lower()
        ]

    # Customer not found (cold-start case)
    if user not in customer_summary["Customer ID"].values:

        return jsonify({
            "recommended_products": [],
            "history": [],
            "customer_cluster": None,
            "cluster_distribution": [],
            "message": "No purchase history found for this customer."
        })

    # ==============================
    # User Cluster
    # ==============================

    user_cluster = int(
        customer_summary.loc[
            customer_summary["Customer ID"] == user,
            "Cluster"
        ].values[0]
    )

    # fix: exclude the user themselves from their own recommendation
    # pool, so recommendations reflect *other* similar customers
    # rather than the user's own repeat purchases
    similar_customers = customer_summary[
        (customer_summary["Cluster"] == user_cluster) &
        (customer_summary["Customer ID"] != user)
    ]["Customer ID"]

    # ==============================
    # Product Recommendation
    # ==============================

    recommended_items = (

        filtered_data[
            filtered_data["Customer ID"].isin(similar_customers)
        ]

        .assign(weight=lambda x: x["Quantity"] * x["Price"])

        .groupby(["Description", "Price"])

        .agg({

            "Quantity": "sum",

            "weight": "sum"

        })

        .sort_values("weight", ascending=False)

        .head(10)

        .reset_index()

    )

    recommendations = []

    for _, row in recommended_items.iterrows():

        recommendations.append({

            "product": row["Description"],

            "price": float(round(row["Price"], 2)),

            "quantity": int(row["Quantity"]),

            "category": infer_category(row["Description"]),

            "popularity": float(round(row["weight"], 2)),

            "cluster": user_cluster

        })

    # ==============================
    # Purchase History
    # ==============================

    history = data[
        data["Customer ID"] == user
    ][
        ["Description", "Quantity", "Price"]
    ].head(10)

    history = history.to_dict(orient="records")

    # ==============================
    # Cluster Distribution
    # ==============================

    cluster_distribution = (

        customer_summary

        .groupby("Cluster")

        .size()

        .reset_index(name="Customers")

        .to_dict(orient="records")

    )

    # ==============================
    # Customer Statistics
    # ==============================

    customer_info = customer_summary[
        customer_summary["Customer ID"] == user
    ].iloc[0]

    return jsonify({

        "customer_cluster": user_cluster,

        "total_clusters": K,

        "customer_quantity": int(customer_info["Quantity"]),

        "customer_avg_price": round(float(customer_info["Price"]), 2),

        "recommended_products": recommendations,

        "history": history,

        "cluster_distribution": cluster_distribution,

        # fix: expose per-cluster characteristics so the frontend
        # can explain *why* this customer landed in their cluster,
        # not just which cluster number they got
        "cluster_stats": cluster_stats

    })


# ==============================
# Run Server
# ==============================

if __name__ == "__main__":
    app.run(debug=True)