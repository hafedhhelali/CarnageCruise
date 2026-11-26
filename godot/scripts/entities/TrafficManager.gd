class_name TrafficManager
extends Node3D

var vehicles: Array[Dictionary] = []
var _glb_cache: Dictionary = {}
const CAR_KEYS := ["vehicle-truck-red", "vehicle-truck-green", "vehicle-truck-yellow", "vehicle-truck-purple", "vehicle-motorcycle"]


func _ready() -> void:
	for i in range(4):
		var key: String = CAR_KEYS[i % CAR_KEYS.size()]
		var node := _spawn_car_node(key)
		node.visible = false
		add_child(node)
		vehicles.append({
			"node": node,
			"active": false,
			"crashed": false,
			"lane": -2.7 if (i % 2 == 0) else 2.7,
			"speed": 12.0 + float(i) * 1.8,
			"vx": 0.0,
			"vy": 0.0,
			"vz": 0.0
		})


func _spawn_car_node(key: String) -> Node3D:
	var path := "res://assets/models/%s.glb" % key
	if ResourceLoader.exists(path):
		if not _glb_cache.has(key):
			_glb_cache[key] = load(path)
		var ps: PackedScene = _glb_cache[key]
		if ps:
			var inst := ps.instantiate() as Node3D
			if inst:
				inst.scale = Vector3.ONE * 0.92
				_fix_car_materials(inst)
				return inst
	var m := MeshInstance3D.new()
	var b := BoxMesh.new()
	b.size = Vector3(1.8, 1.2, 3.8)
	m.mesh = b
	return m


func _fix_car_materials(node: Node) -> void:
	if node is MeshInstance3D and node.mesh != null:
		for s in range(node.mesh.get_surface_count()):
			var mat: Material = node.get_active_material(s)
			if mat is StandardMaterial3D:
				var m2 := mat.duplicate() as StandardMaterial3D
				m2.roughness = maxf(m2.roughness, 0.52)
				m2.metallic = minf(m2.metallic, 0.25)
				node.set_surface_override_material(s, m2)
	for c in node.get_children():
		_fix_car_materials(c)


func reset_traffic() -> void:
	for v in vehicles:
		v["active"] = false
		v["crashed"] = false
		v["node"].visible = false


func update_traffic(delta: float, player_pos: Vector3, player_speed: float, road_straight: bool, can_ram: bool, on_hit: Callable) -> void:
	for i in range(vehicles.size()):
		var v := vehicles[i]
		var n: Node3D = v["node"]
		if v["crashed"]:
			n.position += Vector3(v["vx"], v["vy"], v["vz"]) * delta
			v["vy"] = float(v["vy"]) - 18.0 * delta
			n.rotation.x += 6.0 * delta
			n.rotation.z += 5.0 * delta
			if n.position.y < -3.0:
				v["crashed"] = false
				v["active"] = false
				n.visible = false
			continue

		if not v["active"] or n.position.z < player_pos.z - 18.0:
			var sz := player_pos.z + 65.0 + float(i) * 32.0 + randf_range(0.0, 14.0)
			var lane := -2.6 if (randi() % 2 == 0) else 2.6
			v["lane"] = lane
			v["active"] = true
			v["crashed"] = false
			n.visible = true
			n.rotation = Vector3.ZERO
			n.position = Vector3(RoadCurve.get_road_center_x(sz, road_straight) + lane, 0.0, sz)
			continue

		n.position.z += float(v["speed"]) * delta
		n.position.x = RoadCurve.get_road_center_x(n.position.z, road_straight) + float(v["lane"])
		n.rotation.y = RoadCurve.get_road_angle(n.position.z, road_straight)

		var dz := absf(n.position.z - player_pos.z)
		var dx := absf(n.position.x - player_pos.x)
		if dz < 2.8 and dx < 1.85 and player_pos.y < 1.8:
			if can_ram:
				v["crashed"] = true
				v["vx"] = (1.0 if n.position.x >= player_pos.x else -1.0) * 11.0
				v["vy"] = 12.0
				v["vz"] = maxf(10.0, player_speed * 0.7)
				on_hit.call(n.position, true)
			else:
				# Light vehicle or horse: car stays intact, player bounces sideways & slows down
				var push_dir := -1.0 if player_pos.x < n.position.x else 1.0
				on_hit.call(Vector3(push_dir, 0.0, n.position.z), false)
