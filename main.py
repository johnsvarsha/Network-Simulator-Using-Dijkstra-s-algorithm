from flask import Flask, jsonify, request
import json

app = Flask(__name__)

# Load network topology from JSON file
def load_network():
    with open("network.json", "r") as file:
        return json.load(file)

@app.route("/")
def home():
    return jsonify({
        "project": "Smart Network Routing Simulator",
        "status": "Backend Running Successfully"
    })

@app.route("/network", methods=["GET"])
def get_network():
    data = load_network()
    return jsonify(data)

@app.route("/routers", methods=["GET"])
def get_routers():
    data = load_network()
    return jsonify(data["routers"])

@app.route("/links", methods=["GET"])
def get_links():
    data = load_network()
    return jsonify(data["links"])

@app.route("/statistics", methods=["GET"])
def get_statistics():
    data = load_network()

    total_routers = len(data["routers"])
    total_links = len(data["links"])

    total_cost = sum(link["cost"] for link in data["links"])
    avg_cost = total_cost / total_links

    return jsonify({
        "total_routers": total_routers,
        "total_links": total_links,
        "average_cost": round(avg_cost, 2)
    })

@app.route("/route", methods=["POST"])
def calculate_route():
    request_data = request.json

    source = request_data.get("source")
    destination = request_data.get("destination")

    return jsonify({
        "source": source,
        "destination": destination,
        "algorithm": "Dijkstra",
        "message": "Route calculation handled by frontend simulator"
    })

if __name__ == "__main__":
    app.run(debug=True)