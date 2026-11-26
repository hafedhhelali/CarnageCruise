class_name PlayerVehicle
extends Node3D

var current_bike_id := "tank"
var steer_input: float = 0.0
var smoothed_steer: float = 0.0
var x_offset: float = 0.0
var z_pos: float = 0.0
var jump_y: float = 0.0
var jump_vy: float = 0.0

var _model_holder: Node3D
var _anim_player: AnimationPlayer = null
var _nitro_particles: GPUParticles3D
var _glb_cache: Dictionary = {}

const MAX_OFFSET := 6.55


func _ready() -> void:
	_model_holder = Node3D.new()
	add_child(_model_holder)
	_init_nitro_vfx()
	build_vehicle("tank")


func _init_nitro_vfx() -> void:
	_nitro_particles = GPUParticles3D.new()
	_nitro_particles.amount = 28
	_nitro_particles.lifetime = 0.35
	_nitro_particles.emitting = false
	var pm := ParticleProcessMaterial.new()
	pm.direction = Vector3(0.0, 0.15, -1.0)
	pm.spread = 18.0
	pm.initial_velocity_min = 6.0
	pm.initial_velocity_max = 12.0
	pm.scale_min = 0.25
	pm.scale_max = 0.65
	pm.color = Color(0.15, 0.92, 1.0, 0.95)
	_nitro_particles.process_material = pm
	var quad := SphereMesh.new()
	quad.radius = 0.22
	quad.height = 0.44
	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.albedo_color = Color(0.2, 0.95, 1.0)
	mat.emission_enabled = true
	mat.emission = Color(0.2, 0.95, 1.0)
	mat.emission_energy_multiplier = 2.4
	quad.material = mat
	_nitro_particles.draw_pass_1 = quad
	_nitro_particles.position = Vector3(0.0, 0.55, -1.6)
	add_child(_nitro_particles)


func _get_glb_key_for_bike(bike_id: String) -> String:
	match bike_id:
		"cheval": return "Horse"
		"tank": return "q_tank"
		"aero_jet": return "q_jet"
		"rad_rover": return "q_rover"
		"decapotable": return "vehicle-truck-red"
		"dragster": return "vehicle-truck-purple"
		"rouleau": return "vehicle-truck-yellow"
		"hovercraft": return "vehicle-truck-green"
		_: return "q_tank"


func build_vehicle(bike_id: String) -> void:
	current_bike_id = bike_id
	_anim_player = null
	for c in _model_holder.get_children():
		c.queue_free()

	var key := _get_glb_key_for_bike(bike_id)
	var path := "res://assets/models/%s.glb" % key
	if not ResourceLoader.exists(path):
		return
	if not _glb_cache.has(key):
		_glb_cache[key] = load(path)
	var ps: PackedScene = _glb_cache[key]
	if ps == null:
		return
	var inst := ps.instantiate() as Node3D
	if inst == null:
		return

	var pivot := Node3D.new()
	if key == "q_tank":
		inst.rotation.y = -PI * 0.5
	pivot.add_child(inst)
	_model_holder.add_child(pivot)

	var aabb := _compute_aabb(pivot)
	if aabb.size.length() > 0.01:
		var target_len := 3.8
		if key == "Horse":
			target_len = 2.6
		elif key == "q_jet":
			target_len = 4.2
		var max_dim := maxf(aabb.size.x, maxf(aabb.size.y, aabb.size.z))
		var s := target_len / maxf(max_dim, 0.01)
		pivot.scale = Vector3.ONE * s
		var base_y := 2.3 if key == "q_jet" else (0.35 if bike_id == "hovercraft" else 0.0)
		pivot.position = Vector3(-aabb.get_center().x * s, -aabb.position.y * s + base_y, -aabb.get_center().z * s)

	_nitro_particles.visible = (bike_id != "cheval")
	if bike_id == "cheval":
		_nitro_particles.emitting = false
		_tint_meshes(inst, Color(0.42, 0.24, 0.12))

	_anim_player = _find_animation_player(inst)
	if _anim_player:
		var anims := _anim_player.get_animation_list()
		if anims.size() > 0:
			var target_anim: String = anims[0]
			for a in anims:
				if "Forward" in a or "horse" in a.to_lower():
					target_anim = a
					break
			var anim_res := _anim_player.get_animation(target_anim)
			if anim_res:
				anim_res.loop_mode = Animation.LOOP_LINEAR
			_anim_player.play(target_anim)


func _tint_meshes(node: Node, col: Color) -> void:
	if node is MeshInstance3D:
		var mat := StandardMaterial3D.new()
		mat.albedo_color = col
		mat.roughness = 0.68
		node.material_override = mat
	for c in node.get_children():
		_tint_meshes(c, col)


func _compute_aabb(node: Node3D) -> AABB:
	var result := AABB()
	var first := true
	var stack: Array[Node] = [node]
	var xform_map: Dictionary = {node: Transform3D.IDENTITY}
	while not stack.is_empty():
		var cur: Node = stack.pop_back()
		var cur_xf: Transform3D = xform_map.get(cur, Transform3D.IDENTITY)
		if cur is MeshInstance3D and cur.mesh != null:
			var transformed: AABB = cur_xf * cur.mesh.get_aabb()
			if first:
				result = transformed
				first = false
			else:
				result = result.merge(transformed)
		for ch in cur.get_children():
			if ch is Node3D:
				xform_map[ch] = cur_xf * ch.transform
				stack.append(ch)
	return result


func _find_animation_player(node: Node) -> AnimationPlayer:
	if node is AnimationPlayer:
		return node
	for c in node.get_children():
		var found := _find_animation_player(c)
		if found:
			return found
	return null


func reset_run() -> void:
	x_offset = 0.0
	z_pos = 0.0
	jump_y = 0.0
	jump_vy = 0.0
	smoothed_steer = 0.0
	position = Vector3.ZERO


func trigger_jump(speed: float) -> void:
	if jump_y <= 0.15:
		jump_vy = clampf(5.5 + speed * 0.22, 6.5, 14.5)


func is_heavy_rammer() -> bool:
	return current_bike_id in ["tank", "rouleau"]


func is_airborne_cruiser() -> bool:
	return current_bike_id == "aero_jet"


func get_steer_agility() -> float:
	match current_bike_id:
		"cheval": return 13.5
		"dragster": return 9.0
		"rouleau": return 7.5
		"tank": return 8.5
		_: return 11.2


func update_vehicle(delta: float, speed: float, road_straight: bool) -> void:
	if GameData.is_braking:
		smoothed_steer = 0.0
	else:
		var agility := get_steer_agility()
		smoothed_steer = lerpf(smoothed_steer, steer_input, clampf(delta * agility, 0.0, 1.0))
		x_offset = clampf(x_offset + smoothed_steer * (agility * 0.95) * delta, -MAX_OFFSET, MAX_OFFSET)

	z_pos += speed * delta
	if jump_y > 0.0 or jump_vy > 0.0:
		jump_vy -= 21.0 * delta
		jump_y = maxf(0.0, jump_y + jump_vy * delta)
		if jump_y <= 0.0:
			jump_vy = 0.0

	var road_x := RoadCurve.get_road_center_x(z_pos, road_straight)
	var road_ang := RoadCurve.get_road_angle(z_pos, road_straight)
	var lift := RoadCurve.get_sidewalk_lift(absf(x_offset))
	var hover_y := 2.3 if current_bike_id == "aero_jet" else (maxf(lift, 0.35) if current_bike_id == "hovercraft" else lift)

	position = Vector3(road_x + x_offset, hover_y + jump_y, z_pos)
	rotation.y = road_ang
	_model_holder.rotation.z = lerpf(_model_holder.rotation.z, -smoothed_steer * 0.25, clampf(delta * 8.0, 0.0, 1.0))

	if _anim_player:
		_anim_player.speed_scale = clampf(0.2 + speed * 0.09, 0.15, 2.8)

	_nitro_particles.emitting = GameData.is_nitro_active and speed > 4.0 and current_bike_id != "cheval"
