import heapq
import math
import urllib.request
import json

def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

class GraphOptimizer:
    def __init__(self, locations, roads):
        """
        locations: dict of {location_id: {name, address, category, lat, lng}}
        roads: list of road dicts {id, source_id, target_id, name, distance_km, speed_limit_kph, traffic_multiplier, is_one_way}
        """
        self.locations = {loc['id']: loc for loc in locations}
        self.roads = list(roads)
        self.adj = {loc_id: [] for loc_id in self.locations}
        
        self._ensure_all_nodes_connected()
        self._build_graph()

    def _ensure_all_nodes_connected(self):
        connected_nodes = set()
        for road in self.roads:
            connected_nodes.add(road['source_id'])
            connected_nodes.add(road['target_id'])

        for loc_id, node in self.locations.items():
            if loc_id not in connected_nodes:
                distances = []
                for other_id, other_node in self.locations.items():
                    if other_id != loc_id:
                        dist = haversine_distance(node['lat'], node['lng'], other_node['lat'], other_node['lng'])
                        distances.append((dist, other_id, other_node))

                distances.sort(key=lambda x: x[0])
                for dist, other_id, other_node in distances[:2]:
                    road_name = f"Connecting Road ({node['name']} & {other_node['name']})"
                    dist_km = max(round(dist, 2), 0.5)
                    self.roads.append({
                        "id": 99000 + loc_id + other_id,
                        "source_id": loc_id,
                        "target_id": other_id,
                        "name": road_name,
                        "distance_km": dist_km,
                        "speed_limit_kph": 50,
                        "traffic_multiplier": 1.0,
                        "is_one_way": 0
                    })

    def _build_graph(self):
        for road in self.roads:
            u = road['source_id']
            v = road['target_id']
            if u in self.adj and v in self.adj:
                self.adj[u].append((v, road))
                if not road.get('is_one_way', 0):
                    self.adj[v].append((u, road))

    def _calculate_edge_cost(self, road, vehicle_type='Medium Truck', avoid_traffic=True, optimize_by='time'):
        distance = road['distance_km']
        speed = max(road['speed_limit_kph'], 10)
        traffic = road['traffic_multiplier'] if avoid_traffic else 1.0

        v_type = vehicle_type.lower()
        if 'bike' in v_type or 'scooter' in v_type:
            speed = min(speed, 45)
            effective_traffic = 1.0 + (traffic - 1.0) * 0.3
        elif 'light' in v_type or 'van' in v_type:
            effective_traffic = traffic
        elif 'heavy' in v_type:
            speed = speed * 0.85
            effective_traffic = traffic * 1.35
        else:
            speed = speed * 0.95
            effective_traffic = traffic * 1.15

        travel_time_hours = (distance / speed) * effective_traffic

        if optimize_by == 'distance':
            return distance
        else:
            return travel_time_hours * 60.0

    def fetch_real_osrm_directions(self, start_lat, start_lng, dest_lat, dest_lng):
        try:
            url = f"http://router.project-osrm.org/route/v1/driving/{start_lng},{start_lat};{dest_lng},{dest_lat}?overview=full&geometries=geojson&steps=true"
            req = urllib.request.Request(url, headers={'User-Agent': 'DeliveryRouteOptimizer/1.0'})
            with urllib.request.urlopen(req, timeout=4) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode('utf-8'))
                    if data.get('code') == 'Ok' and data.get('routes'):
                        route = data['routes'][0]
                        geometry = route['geometry']['coordinates']
                        lat_lng_polyline = [[pt[1], pt[0]] for pt in geometry]
                        
                        raw_steps = route['legs'][0]['steps']
                        parsed_directions = []

                        for step in raw_steps:
                            street_name = step.get('name', '').strip()
                            if not street_name:
                                street_name = "connecting road"
                            
                            dist_m = step.get('distance', 0)
                            dur_s = step.get('duration', 0)
                            maneuver = step.get('maneuver', {})
                            m_type = maneuver.get('type', 'turn')
                            m_mod = maneuver.get('modifier', '')

                            if dist_m < 5 and m_type != 'arrive':
                                continue

                            icon = "🚗"
                            action = "Drive"

                            if m_type == 'depart':
                                icon = "🛫"
                                action = "Head"
                            elif m_type == 'arrive':
                                icon = "📍"
                                action = "Arrive at destination"
                            elif 'right' in m_mod:
                                icon = "➡️" if m_mod == 'right' else "↗️"
                                action = f"Turn {m_mod} onto"
                            elif 'left' in m_mod:
                                icon = "⬅️" if m_mod == 'left' else "↖️"
                                action = f"Turn {m_mod} onto"
                            elif 'straight' in m_mod:
                                icon = "⬆️"
                                action = "Continue straight onto"
                            elif 'roundabout' in m_type:
                                icon = "🔄"
                                action = "At roundabout, take exit onto"

                            dist_str = f"{dist_m:.0f} m" if dist_m < 1000 else f"{(dist_m/1000):.1f} km"
                            dur_str = f"~{math.ceil(dur_s/60)} mins" if dur_s >= 60 else f"~{int(dur_s)} secs"

                            if m_type == 'arrive':
                                parsed_directions.append(f"{icon} <strong>{action}</strong> ({dist_str})")
                            else:
                                parsed_directions.append(f"{icon} <strong>{action} {street_name}</strong> ({dist_str}, {dur_str})")

                        return {
                            "success": True,
                            "polyline": lat_lng_polyline,
                            "distance_km": round(route['distance'] / 1000.0, 2),
                            "duration_mins": round(route['duration'] / 60.0, 1),
                            "real_directions": parsed_directions
                        }
        except Exception as e:
            print(f"OSRM real routing API fallback: {e}")
        
        return {"success": False}

    def dijkstra_shortest_path(self, start_id, end_id, vehicle_type='Medium Truck', avoid_traffic=True, optimize_by='time'):
        if start_id not in self.locations or end_id not in self.locations:
            raise ValueError("Start or destination location does not exist.")

        start_loc = self.locations[start_id]
        end_loc = self.locations[end_id]

        if start_id == end_id:
            return {
                "found": True,
                "path_nodes": [start_loc],
                "coordinates": [[start_loc['lat'], start_loc['lng']]],
                "total_distance_km": 0.0,
                "total_time_mins": 0.0,
                "fuel_liters": 0.0,
                "co2_kg": 0.0,
                "directions": ["Start and destination are identical."]
            }

        # Priority queue Dijkstra
        distances = {node: float('inf') for node in self.locations}
        distances[start_id] = 0.0
        
        pq = [(0.0, start_id)]
        previous = {node: None for node in self.locations}
        road_used = {node: None for node in self.locations}

        while pq:
            current_cost, u = heapq.heappop(pq)

            if current_cost > distances[u]:
                continue

            if u == end_id:
                break

            for v, road in self.adj.get(u, []):
                cost = self._calculate_edge_cost(road, vehicle_type, avoid_traffic, optimize_by)
                new_cost = current_cost + cost

                if new_cost < distances[v]:
                    distances[v] = new_cost
                    previous[v] = u
                    road_used[v] = road
                    heapq.heappush(pq, (new_cost, v))

        path_node_ids = []
        curr = end_id
        while curr is not None:
            path_node_ids.append(curr)
            curr = previous[curr]
        path_node_ids.reverse()

        path_nodes = [self.locations[nid] for nid in path_node_ids] if path_node_ids else [start_loc, end_loc]

        total_distance = 0.0
        total_time_mins = 0.0
        directions = []

        v_type = vehicle_type.lower()
        if 'bike' in v_type:
            fuel_rate = 0.028
        elif 'light' in v_type:
            fuel_rate = 0.09
        elif 'heavy' in v_type:
            fuel_rate = 0.28
        else:
            fuel_rate = 0.16

        for i in range(1, len(path_node_ids)):
            curr_node_id = path_node_ids[i]
            prev_node_id = path_node_ids[i-1]
            road = road_used.get(curr_node_id)
            if not road:
                continue

            dist = road['distance_km']
            traffic = road['traffic_multiplier']
            speed = max(road['speed_limit_kph'], 10)

            edge_time = (dist / speed) * 60.0 * (traffic if avoid_traffic else 1.0)
            total_distance += dist
            total_time_mins += edge_time

            traffic_label = "Normal Traffic"
            if traffic > 1.8:
                traffic_label = "Heavy Traffic (Rerouted)" if avoid_traffic else "Heavy Congestion"
            elif traffic > 1.3:
                traffic_label = "Moderate Traffic"

            directions.append(
                f"Drive on {road['name']} from {self.locations[prev_node_id]['name']} to {self.locations[curr_node_id]['name']} ({dist:.1f} km, ~{math.ceil(edge_time)} mins, {traffic_label})"
            )

        # OSRM real street polyline lookup
        real_osrm = self.fetch_real_osrm_directions(
            start_loc['lat'], start_loc['lng'],
            end_loc['lat'], end_loc['lng']
        )

        if real_osrm.get('success'):
            coordinates = real_osrm['polyline']
            final_directions = real_osrm['real_directions']
            if total_distance == 0.0:
                total_distance = real_osrm['distance_km']
                total_time_mins = real_osrm['duration_mins']
        else:
            coordinates = [[node['lat'], node['lng']] for node in path_nodes]
            final_directions = directions if directions else [f"Drive directly from {start_loc['name']} to {end_loc['name']}"]

        fuel_liters = round(total_distance * fuel_rate, 2)
        co2_kg = round(fuel_liters * 2.68, 2)

        return {
            "found": True,
            "path_nodes": path_nodes,
            "coordinates": coordinates,
            "total_distance_km": round(total_distance, 2),
            "total_time_mins": round(total_time_mins, 1),
            "fuel_liters": fuel_liters,
            "co2_kg": co2_kg,
            "directions": final_directions,
            "is_real_road_routing": real_osrm.get('success', False),
            "vehicle_type": vehicle_type,
            "avoid_traffic": avoid_traffic
        }

    def analyze_and_reroute_mid_drive(self, current_node_id, destination_node_id, vehicle_type='Medium Truck', avoid_traffic=True):
        new_route = self.dijkstra_shortest_path(
            start_id=current_node_id,
            end_id=destination_node_id,
            vehicle_type=vehicle_type,
            avoid_traffic=avoid_traffic
        )

        return {
            "rerouted": True,
            "reason": "Traffic spike detected en-route. Re-routed via fastest bypass road.",
            "new_route": new_route
        }

    def multi_stop_tsp_route(self, start_id, stop_ids, vehicle_type='Medium Truck', avoid_traffic=True):
        current = start_id
        unvisited = set(stop_ids)
        if current in unvisited:
            unvisited.remove(current)

        full_path_nodes = [self.locations[current]]
        full_coordinates = []
        total_dist = 0.0
        total_time = 0.0
        all_directions = []

        while unvisited:
            best_stop = None
            best_res = None
            min_cost = float('inf')

            for stop in unvisited:
                res = self.dijkstra_shortest_path(current, stop, vehicle_type, avoid_traffic)
                if res['found'] and res['total_time_mins'] < min_cost:
                    min_cost = res['total_time_mins']
                    best_stop = stop
                    best_res = res

            if not best_stop or not best_res:
                break

            full_path_nodes.extend(best_res['path_nodes'][1:])
            full_coordinates.extend(best_res['coordinates'])
            total_dist += best_res['total_distance_km']
            total_time += best_res['total_time_mins']
            all_directions.extend(best_res['directions'])
            all_directions.append(f"📦 <strong>Arrived & Delivered order at {self.locations[best_stop]['name']}</strong>")

            unvisited.remove(best_stop)
            current = best_stop

        return {
            "found": True,
            "path_nodes": full_path_nodes,
            "coordinates": full_coordinates,
            "total_distance_km": round(total_dist, 2),
            "total_time_mins": round(total_time, 1),
            "directions": all_directions
        }
