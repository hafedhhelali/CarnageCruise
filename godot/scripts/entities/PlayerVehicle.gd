class_name PlayerVehicle
extends Node3D

var current_bike_id := "tank"
var steer_input: float = 0.0
var smoothed_steer: float = 0.0
var x_offset: float = 0.0
var z_pos: float = 0.0
var jump_y: float = 0.0
var jump_vy: float = 0.0
var _roll_impulse: float = 0.0

var _model_holder: Node3D
var _anim_player: AnimationPlayer = null
var _weapon_mount: Node3D = null
var _weapon_recoil: float = 0.0
var _wheel_nodes: Array[Node3D] = []
var _nitro_particles: GPUParticles3D
var _smoke_particles: GPUParticles3D
var _glb_cache: Dictionary = {}

const MAX_OFFSET := 6.55


func _ready() -> void:
	_model_holder = Node3D.new()
	add_child(_model_holder)
	_init_nitro_vfx()
	build_vehicle("tank")


func _init_nitro_vfx() -> void:
	_nitro_particles = GPUParticles3D.new()
	_nitro_particles.amount = 20
	_nitro_particles.lifetime = 0.16
	_nitro_particles.emitting = false
	var pm := ParticleProcessMaterial.new()
	pm.direction = Vector3(0.0, 0.05, -1.0)
	pm.spread = 8.0
	pm.initial_velocity_min = 9.0
	pm.initial_velocity_max = 15.0
	pm.scale_min = 0.25
	pm.scale_max = 0.55
	pm.color = Color(0.25, 0.85, 1.0, 0.72)
	_nitro_particles.process_material = pm
	var streak := BoxMesh.new()
	streak.size = Vector3(0.06, 0.06, 0.45)
	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.albedo_color = Color(0.45, 0.92, 1.0, 0.72)
	mat.emission_enabled = true
	mat.emission = Color(0.25, 0.88, 1.0)
	mat.emission_energy_multiplier = 2.0
	streak.material = mat
	_nitro_particles.draw_pass_1 = streak
	_nitro_particles.position = Vector3(0.0, 0.55, -1.6)
	add_child(_nitro_particles)

	_smoke_particles = GPUParticles3D.new()
	_smoke_particles.amount = 14
	_smoke_particles.lifetime = 0.55
	_smoke_particles.emitting = false
	var spm := ParticleProcessMaterial.new()
	spm.direction = Vector3(0.0, 0.25, -1.0)
	spm.spread = 16.0
	spm.initial_velocity_min = 2.0
	spm.initial_velocity_max = 4.5
	spm.scale_min = 0.12
	spm.scale_max = 0.28
	spm.color = Color(0.78, 0.8, 0.84, 0.22)
	_smoke_particles.process_material = spm
	var sm := SphereMesh.new()
	sm.radius = 0.12
	sm.height = 0.24
	var smat := StandardMaterial3D.new()
	smat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	smat.albedo_color = Color(0.75, 0.78, 0.82, 0.2)
	smat.roughness = 1.0
	sm.material = smat
	_smoke_particles.draw_pass_1 = sm
	_smoke_particles.position = Vector3(0.0, 0.35, -1.7)
	add_child(_smoke_particles)


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
	_weapon_mount = null
	_weapon_recoil = 0.0
	_wheel_nodes.clear()
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
		inst.rotation.y = PI * 0.5
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
		_tint_meshes(inst, Color(0.45, 0.25, 0.12))
		_attach_rider(pivot, aabb, pivot.scale.x)
	else:
		_apply_distinct_vehicle_colors(inst, bike_id)
		if not (bike_id in ["tank", "aero_jet"]):
			_attach_weapon_mount(pivot, aabb, pivot.scale.x)
		if _wheel_nodes.is_empty() and bike_id in ["rad_rover", "tank", "rouleau"]:
			_attach_visible_side_wheels(pivot, aabb, pivot.scale.x)

	_wheel_nodes.clear()
	_collect_wheels(inst, _wheel_nodes)
	_fix_vehicle_materials(inst)
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


func _attach_weapon_mount(pivot: Node3D, veh_aabb: AABB, veh_scale: float) -> void:
	var mount := Node3D.new()
	var inv_s := 1.0 / maxf(veh_scale, 0.001)
	mount.scale = Vector3.ONE * inv_s
	mount.position = Vector3(veh_aabb.get_center().x, veh_aabb.position.y + veh_aabb.size.y * 0.96, veh_aabb.get_center().z)
	var gun_mat := StandardMaterial3D.new()
	gun_mat.albedo_color = Color(0.18, 0.2, 0.24)
	gun_mat.metallic = 0.65
	gun_mat.roughness = 0.42
	var base := MeshInstance3D.new()
	var bmesh := BoxMesh.new()
	bmesh.size = Vector3(0.55, 0.22, 0.65)
	base.mesh = bmesh
	base.material_override = gun_mat
	mount.add_child(base)
	for tx in [-0.18, 0.18]:
		var tube := MeshInstance3D.new()
		var tmesh := CylinderMesh.new()
		tmesh.top_radius = 0.09
		tmesh.bottom_radius = 0.1
		tmesh.height = 1.05
		tube.mesh = tmesh
		tube.material_override = gun_mat
		tube.rotation_degrees.x = 90.0
		tube.position = Vector3(tx, 0.14, 0.28)
		mount.add_child(tube)
	_weapon_mount = mount
	pivot.add_child(mount)


func trigger_weapon_recoil() -> void:
	_weapon_recoil = 0.28


func _tint_meshes(node: Node, col: Color) -> void:
	if node is MeshInstance3D:
		var mat := StandardMaterial3D.new()
		mat.albedo_color = col
		mat.roughness = 0.68
		node.material_override = mat
	for c in node.get_children():
		_tint_meshes(c, col)


func _attach_rider(pivot: Node3D, horse_aabb: AABB, horse_scale: float) -> void:
	# Clean articulated jockey seated on saddle (never T-pose!)
	var jockey := Node3D.new()
	var inv_s := 1.0 / maxf(horse_scale, 0.0001)
	jockey.scale = Vector3.ONE * inv_s
	jockey.position = Vector3(horse_aabb.get_center().x, horse_aabb.position.y + horse_aabb.size.y * 0.66, horse_aabb.get_center().z + horse_aabb.size.z * 0.03)

	var saddle_mat := StandardMaterial3D.new()
	saddle_mat.albedo_color = Color(0.22, 0.12, 0.06)
	saddle_mat.roughness = 0.8
	var jacket_mat := StandardMaterial3D.new()
	jacket_mat.albedo_color = Color(0.14, 0.36, 0.72)
	jacket_mat.roughness = 0.7
	var pants_mat := StandardMaterial3D.new()
	pants_mat.albedo_color = Color(0.86, 0.84, 0.78)
	pants_mat.roughness = 0.75
	var skin_mat := StandardMaterial3D.new()
	skin_mat.albedo_color = Color(0.88, 0.68, 0.54)
	skin_mat.roughness = 0.75
	var helmet_mat := StandardMaterial3D.new()
	helmet_mat.albedo_color = Color(0.82, 0.16, 0.20)
	helmet_mat.roughness = 0.45

	var saddle := MeshInstance3D.new()
	var sm := BoxMesh.new()
	sm.size = Vector3(0.46, 0.12, 0.54)
	saddle.mesh = sm
	saddle.material_override = saddle_mat
	jockey.add_child(saddle)

	var torso := MeshInstance3D.new()
	var tm := BoxMesh.new()
	tm.size = Vector3(0.36, 0.52, 0.24)
	torso.mesh = tm
	torso.material_override = jacket_mat
	torso.position = Vector3(0.0, 0.34, 0.05)
	torso.rotation_degrees.x = 24.0
	jockey.add_child(torso)

	var head := MeshInstance3D.new()
	var hm := SphereMesh.new()
	hm.radius = 0.14
	hm.height = 0.28
	head.mesh = hm
	head.material_override = skin_mat
	head.position = Vector3(0.0, 0.66, 0.18)
	jockey.add_child(head)

	var helmet := MeshInstance3D.new()
	var hlm := SphereMesh.new()
	hlm.radius = 0.155
	hlm.height = 0.20
	helmet.mesh = hlm
	helmet.material_override = helmet_mat
	helmet.position = Vector3(0.0, 0.72, 0.18)
	jockey.add_child(helmet)

	for sx in [-1.0, 1.0]:
		var arm := MeshInstance3D.new()
		var am := BoxMesh.new()
		am.size = Vector3(0.11, 0.40, 0.11)
		arm.mesh = am
		arm.material_override = jacket_mat
		arm.position = Vector3(sx * 0.22, 0.38, 0.22)
		arm.rotation_degrees = Vector3(58.0, 0.0, sx * -12.0)
		jockey.add_child(arm)

		var leg := MeshInstance3D.new()
		var lm := BoxMesh.new()
		lm.size = Vector3(0.13, 0.44, 0.14)
		leg.mesh = lm
		leg.material_override = pants_mat
		leg.position = Vector3(sx * 0.23, -0.08, 0.06)
		leg.rotation_degrees = Vector3(-28.0, 0.0, sx * 18.0)
		jockey.add_child(leg)

	pivot.add_child(jockey)


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


func _apply_distinct_vehicle_colors(node: Node, bike_id: String) -> void:
	var body_col := Color(0.84, 0.16, 0.20)
	match bike_id:
		"tank": body_col = Color(0.26, 0.36, 0.22)
		"aero_jet": body_col = Color(0.88, 0.34, 0.10)
		"rad_rover": body_col = Color(0.82, 0.44, 0.12)
		"decapotable": body_col = Color(0.86, 0.14, 0.20)
		"dragster": body_col = Color(0.48, 0.14, 0.82)
		"rouleau": body_col = Color(0.92, 0.68, 0.08)
		"hovercraft": body_col = Color(0.08, 0.62, 0.46)
	_tint_vehicle_parts(node, body_col)


func _tint_vehicle_parts(node: Node, body_col: Color) -> void:
	if node is MeshInstance3D and node.mesh != null:
		var n_low := node.name.to_lower()
		var mat := StandardMaterial3D.new()
		mat.roughness = 0.65
		mat.metallic = 0.15
		mat.metallic_specular = 0.18
		if "wheel" in n_low or "tire" in n_low or "track" in n_low:
			mat.albedo_color = Color(0.11, 0.11, 0.13)
		elif "gun" in n_low or "turret" in n_low or "fork" in n_low or "underside" in n_low:
			mat.albedo_color = Color(0.22, 0.24, 0.28)
		else:
			mat.albedo_color = body_col
		node.material_override = mat
	for c in node.get_children():
		_tint_vehicle_parts(c, body_col)


func _attach_visible_side_wheels(pivot: Node3D, veh_aabb: AABB, veh_scale: float) -> void:
	var inv_s := 1.0 / maxf(veh_scale, 0.001)
	var tire_mat := StandardMaterial3D.new()
	tire_mat.albedo_color = Color(0.10, 0.10, 0.12)
	tire_mat.roughness = 0.8
	var rim_mat := StandardMaterial3D.new()
	rim_mat.albedo_color = Color(0.86, 0.88, 0.92)
	rim_mat.roughness = 0.4
	for sx in [-1.0, 1.0]:
		for sz in [-0.32, 0.32]:
			var wp := Node3D.new()
			wp.scale = Vector3.ONE * inv_s
			wp.position = Vector3(veh_aabb.get_center().x + sx * veh_aabb.size.x * 0.48, veh_aabb.position.y + veh_aabb.size.y * 0.22, veh_aabb.get_center().z + sz * veh_aabb.size.z)
			var tire := MeshInstance3D.new()
			var cm := CylinderMesh.new()
			cm.top_radius = 0.34
			cm.bottom_radius = 0.34
			cm.height = 0.20
			tire.mesh = cm
			tire.rotation_degrees.z = 90.0
			tire.material_override = tire_mat
			wp.add_child(tire)
			var bar := MeshInstance3D.new()
			var bm := BoxMesh.new()
			bm.size = Vector3(0.23, 0.10, 0.58)
			bar.mesh = bm
			bar.material_override = rim_mat
			wp.add_child(bar)
			pivot.add_child(wp)
			_wheel_nodes.append(wp)


func _fix_vehicle_materials(node: Node) -> void:
	if node is MeshInstance3D and node.mesh != null:
		for s in range(node.mesh.get_surface_count()):
			var mat: Material = node.get_active_material(s)
			if mat is StandardMaterial3D:
				var m2 := mat.duplicate() as StandardMaterial3D
				m2.roughness = maxf(m2.roughness, 0.68)
				m2.metallic = minf(m2.metallic, 0.12)
				m2.metallic_specular = 0.15
				node.set_surface_override_material(s, m2)
	for c in node.get_children():
		_fix_vehicle_materials(c)


func _collect_wheels(node: Node, out: Array[Node3D]) -> void:
	var n_low := node.name.to_lower()
	if node is MeshInstance3D and ("wheel-" in n_low or "tire" in n_low or "roue" in n_low):
		var mi: MeshInstance3D = node
		var aabb := mi.mesh.get_aabb() if mi.mesh else AABB()
		if aabb.size.length() > 0.05:
			# Wrap wheel in a centered pivot so rotation happens around its true axle!
			var wpivot := Node3D.new()
			var c := aabb.get_center()
			wpivot.position = mi.position + c
			var par := mi.get_parent()
			if par:
				par.add_child(wpivot)
				par.remove_child(mi)
				wpivot.add_child(mi)
				mi.position = -c
				# Add cross-spoke metallic rim so wheel rotation is 100% obvious!
				for rot_deg in [0.0, 90.0]:
					var spoke := MeshInstance3D.new()
					var smesh := BoxMesh.new()
					smesh.size = Vector3(aabb.size.x * 1.14, aabb.size.y * 0.18, aabb.size.z * 0.78)
					var smat := StandardMaterial3D.new()
					smat.albedo_color = Color(0.92, 0.94, 0.98)
					smat.roughness = 0.4
					spoke.mesh = smesh
					spoke.rotation_degrees.x = rot_deg
					spoke.material_override = smat
					wpivot.add_child(spoke)
				out.append(wpivot)
				return
	for c in node.get_children():
		_collect_wheels(c, out)


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


func trigger_edge_ramp(side: float, speed: float) -> void:
	if jump_y <= 0.15:
		jump_vy = clampf(3.2 + speed * 0.12, 3.8, 8.2)
		_roll_impulse = side * 0.58
		x_offset = clampf(x_offset + side * 0.45, -MAX_OFFSET, MAX_OFFSET)


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
	_roll_impulse = lerpf(_roll_impulse, 0.0, clampf(delta * 4.5, 0.0, 1.0))
	var sway := sin(z_pos * 0.45) * 0.025 if speed > 4.0 else 0.0
	var target_bank := -smoothed_steer * 0.22 + _roll_impulse + sway
	_model_holder.rotation.z = lerpf(_model_holder.rotation.z, target_bank, clampf(delta * 10.0, 0.0, 1.0))
	# Prevent vehicle chassis from sinking into the asphalt when banking left/right!
	_model_holder.position.y = absf(sin(_model_holder.rotation.z)) * 0.82

	for w in _wheel_nodes:
		if is_instance_valid(w):
			w.rotate_x(speed * delta * 3.8)
	if is_instance_valid(_weapon_mount):
		_weapon_recoil = lerpf(_weapon_recoil, 0.0, clampf(delta * 14.0, 0.0, 1.0))
		_weapon_mount.position.z -= _weapon_recoil * delta * 2.0

	if _anim_player:
		if current_bike_id == "cheval" and (GameData.is_braking or speed < 1.2):
			_anim_player.speed_scale = 0.0
		else:
			_anim_player.speed_scale = clampf(0.2 + speed * 0.09, 0.15, 2.8)

	_nitro_particles.emitting = GameData.is_nitro_active and speed > 4.0 and current_bike_id != "cheval"
	_smoke_particles.emitting = (not GameData.is_nitro_active) and speed > 5.0 and current_bike_id != "cheval" and current_bike_id != "aero_jet"
