class_name WorldBuilder
extends Node3D

const CHUNK_LENGTH := 60.0
const TOTAL_CHUNKS := 5

var chunks: Array[Node3D] = []
var props_pool: Array[Dictionary] = []
var finish_arch: Node3D = null
var finish_distance: float = 1650.0
var road_straight := false
var current_biome := "park"
var challenge_mode := "STANDARD"

var _world_env: WorldEnvironment
var _sun_light: DirectionalLight3D
var _glb_cache: Dictionary = {}
var _road_mat: StandardMaterial3D
var _sidewalk_mat: StandardMaterial3D
var _stripe_mat: StandardMaterial3D
var _curb_mat: StandardMaterial3D


func _ready() -> void:
	_init_environment()
	_init_materials()


func _init_environment() -> void:
	_world_env = WorldEnvironment.new()
	var env := Environment.new()
	env.background_mode = Environment.BG_SKY
	var sky := Sky.new()
	var p_mat := PanoramaSkyMaterial.new()
	var hdr_path := "res://assets/hdr/pedestrian_overpass_1k.hdr"
	if ResourceLoader.exists(hdr_path):
		p_mat.panorama = load(hdr_path)
	sky.sky_material = p_mat
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	env.ambient_light_sky_contribution = 0.72
	env.tonemap_mode = Environment.TONE_MAPPER_ACES
	env.tonemap_exposure = 1.05
	env.glow_enabled = true
	env.glow_intensity = 0.55
	env.glow_bloom = 0.18
	env.glow_hdr_threshold = 1.05
	env.fog_enabled = true
	env.fog_light_color = Color(0.75, 0.84, 0.94)
	env.fog_density = 0.0028
	_world_env.environment = env
	add_child(_world_env)

	_sun_light = DirectionalLight3D.new()
	_sun_light.rotation_degrees = Vector3(-48.0, 28.0, 0.0)
	_sun_light.light_color = Color(1.0, 0.96, 0.88)
	_sun_light.light_energy = 1.35
	_sun_light.shadow_enabled = true
	_sun_light.directional_shadow_max_distance = 75.0
	add_child(_sun_light)


func _init_materials() -> void:
	_road_mat = StandardMaterial3D.new()
	_road_mat.albedo_color = Color(0.14, 0.16, 0.19)
	_road_mat.roughness = 0.48
	_road_mat.metallic = 0.08

	_sidewalk_mat = StandardMaterial3D.new()
	_sidewalk_mat.albedo_color = Color(0.56, 0.58, 0.62)
	_sidewalk_mat.roughness = 0.85

	_curb_mat = StandardMaterial3D.new()
	_curb_mat.albedo_color = Color(0.36, 0.38, 0.42)
	_curb_mat.roughness = 0.75

	_stripe_mat = StandardMaterial3D.new()
	_stripe_mat.albedo_color = Color(0.95, 0.96, 0.98)
	_stripe_mat.roughness = 0.7


func _apply_atmosphere(city_def: Dictionary) -> void:
	var preset := "DAY_CLEAR"
	if bool(city_def.get("isNuclearMission", false)):
		preset = "DUSK"
	elif GameData.challenge_mode == "EXTREME_STORM":
		preset = "STORM"
	elif (randi() % 4) == 0:
		preset = "NIGHT"

	var env := _world_env.environment
	var sky_mat := env.sky.sky_material as PanoramaSkyMaterial
	var hdr := "res://assets/hdr/pedestrian_overpass_1k.hdr"
	if preset == "DUSK":
		hdr = "res://assets/hdr/venice_sunset_1k.hdr"
		env.fog_light_color = Color(0.88, 0.56, 0.42)
		_sun_light.light_color = Color(1.0, 0.74, 0.48)
		_sun_light.light_energy = 1.15
	elif preset == "NIGHT":
		hdr = "res://assets/hdr/moonless_golf_1k.hdr"
		env.fog_light_color = Color(0.08, 0.11, 0.2)
		_sun_light.light_color = Color(0.65, 0.78, 1.0)
		_sun_light.light_energy = 0.65
	elif preset == "STORM":
		env.fog_light_color = Color(0.42, 0.48, 0.55)
		_sun_light.light_energy = 0.75
		_road_mat.roughness = 0.22
	else:
		env.fog_light_color = Color(0.75, 0.84, 0.94)
		_sun_light.light_color = Color(1.0, 0.96, 0.88)
		_sun_light.light_energy = 1.35
		_road_mat.roughness = 0.48

	if ResourceLoader.exists(hdr):
		sky_mat.panorama = load(hdr)


func setup_city(city_def: Dictionary, finish_dist: float, chal_mode: String) -> void:
	clear_world()
	finish_distance = finish_dist
	challenge_mode = chal_mode
	road_straight = bool(city_def.get("roadStraight", false))
	current_biome = GameData.get_city_biome(city_def)
	_apply_atmosphere(city_def)

	for i in range(TOTAL_CHUNKS):
		var c := _build_chunk(float(i) * CHUNK_LENGTH, i)
		chunks.append(c)
		add_child(c)

	_build_finish_arch(finish_distance)


func clear_world() -> void:
	for c in chunks:
		if is_instance_valid(c):
			c.queue_free()
	chunks.clear()
	props_pool.clear()
	if is_instance_valid(finish_arch):
		finish_arch.queue_free()
		finish_arch = null


func _load_glb_scene(key: String) -> PackedScene:
	if _glb_cache.has(key):
		return _glb_cache[key]
	var path := "res://assets/models/%s.glb" % key
	if ResourceLoader.exists(path):
		var res := load(path)
		if res is PackedScene:
			_glb_cache[key] = res
			return res
	return null


func _instantiate_normalized(key: String, target_size: Vector3, rot_y: float = 0.0) -> Node3D:
	var ps := _load_glb_scene(key)
	if ps == null:
		return null
	var root := Node3D.new()
	var inst := ps.instantiate() as Node3D
	if inst == null:
		return null
	inst.rotation.y = rot_y
	root.add_child(inst)
	var aabb := _compute_aabb(inst)
	if aabb.size.y > 0.001:
		var sx := target_size.x / maxf(aabb.size.x, 0.01)
		var sy := target_size.y / maxf(aabb.size.y, 0.01)
		var sz := target_size.z / maxf(aabb.size.z, 0.01)
		if target_size.x <= 0.0:
			sx = sy
			sz = sy
		inst.scale = Vector3(sx, sy, sz)
		var aabb2 := _compute_aabb(inst)
		inst.position = Vector3(-aabb2.get_center().x, -aabb2.position.y, -aabb2.get_center().z)
	return root


func _compute_aabb(node: Node3D) -> AABB:
	var result := AABB()
	var first := true
	var stack: Array[Node] = [node]
	var xform_map: Dictionary = {node: Transform3D.IDENTITY}
	while not stack.is_empty():
		var cur: Node = stack.pop_back()
		var cur_xf: Transform3D = xform_map.get(cur, Transform3D.IDENTITY)
		if cur is MeshInstance3D and cur.mesh != null:
			var ma: AABB = cur.mesh.get_aabb()
			var transformed: AABB = cur_xf * ma
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


func _build_ribbon_mesh(z_start: float, width: float, x_offset: float, y_base: float, height: float, mat: Material) -> MeshInstance3D:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var segs := 24
	var step := CHUNK_LENGTH / float(segs)
	for i in range(segs):
		var z0 := float(i) * step
		var z1 := float(i + 1) * step
		var cx0 := RoadCurve.get_road_center_x(z_start + z0, road_straight) + x_offset
		var cx1 := RoadCurve.get_road_center_x(z_start + z1, road_straight) + x_offset
		var hw := width * 0.5
		var v00 := Vector3(cx0 - hw, y_base + height, z0)
		var v10 := Vector3(cx0 + hw, y_base + height, z0)
		var v01 := Vector3(cx1 - hw, y_base + height, z1)
		var v11 := Vector3(cx1 + hw, y_base + height, z1)
		st.set_normal(Vector3.UP)
		st.add_vertex(v00)
		st.add_vertex(v01)
		st.add_vertex(v10)
		st.add_vertex(v10)
		st.add_vertex(v01)
		st.add_vertex(v11)
	var mi := MeshInstance3D.new()
	mi.mesh = st.commit()
	mi.material_override = mat
	return mi


func _build_chunk(z_start: float, chunk_idx: int) -> Node3D:
	var chunk := Node3D.new()
	chunk.position = Vector3(0.0, 0.0, z_start)
	chunk.set_meta("chunk_idx", chunk_idx)

	# Road + Sidewalks
	chunk.add_child(_build_ribbon_mesh(z_start, 10.8, 0.0, 0.0, 0.0, _road_mat))
	chunk.add_child(_build_ribbon_mesh(z_start, 3.6, -7.2, 0.0, 0.25, _sidewalk_mat))
	chunk.add_child(_build_ribbon_mesh(z_start, 3.6, 7.2, 0.0, 0.25, _sidewalk_mat))

	# Center dashed lines
	for s in range(6):
		var lz := float(s) * 10.0 + 4.0
		var wz := z_start + lz
		var rx := RoadCurve.get_road_center_x(wz, road_straight)
		var ang := RoadCurve.get_road_angle(wz, road_straight)
		var stripe := MeshInstance3D.new()
		var box := BoxMesh.new()
		box.size = Vector3(0.2, 0.02, 3.8)
		stripe.mesh = box
		stripe.material_override = _stripe_mat
		stripe.position = Vector3(rx, 0.015, lz)
		stripe.rotation.y = ang
		chunk.add_child(stripe)

	# Buildings (GLBs properly sized and aligned at x = +-9.2m, zero sidewalk overhang!)
	var bldg_keys := ["q_bldg_balcony", "q_bldg_wide", "q_bldg_tall", "q_house1"]
	for side in [-1, 1]:
		for slot in range(4):
			var lz := float(slot) * 15.0 + 7.5
			var wz := z_start + lz
			var rx := RoadCurve.get_road_center_x(wz, road_straight)
			var ang := RoadCurve.get_road_angle(wz, road_straight)
			var key: String = bldg_keys[(chunk_idx + slot + (1 if side > 0 else 0)) % bldg_keys.size()]
			var h := 11.0 + float((chunk_idx + slot) % 3) * 3.5
			var bldg := _instantiate_normalized(key, Vector3(9.5, h, 13.5), -PI * 0.5 if side > 0 else PI * 0.5)
			if bldg:
				bldg.position = Vector3(rx + float(side) * 14.0, 0.0, lz)
				bldg.rotation.y = ang
				chunk.add_child(bldg)

	# Trees, Streetlights & Grounded Smashable Stalls
	var district := (chunk_idx / 3) % 4
	for idx in range(3):
		var lz := float(idx) * 20.0 + 10.0
		var wz := z_start + lz
		var rx := RoadCurve.get_road_center_x(wz, road_straight)
		var ang := RoadCurve.get_road_angle(wz, road_straight)
		var side := 1 if (idx % 2 == 0) else -1

		# Tree
		var tree_key := "q_palm" if current_biome in ["corniche", "beach", "desert"] else ("q_pinetree" if district == 2 else "q_tree")
		var tree := _instantiate_normalized(tree_key, Vector3(0.0, 4.6, 0.0))
		if tree:
			tree.position = Vector3(rx + float(side) * 6.3, 0.25, lz)
			chunk.add_child(tree)
			props_pool.append({"node": tree, "chunk": chunk, "base_x": float(side) * 6.3, "local_z": lz, "type": "tree", "hit": false})

		# Streetlight
		var lamp := _instantiate_normalized("q_streetlight", Vector3(0.0, 4.2, 0.0), PI * 0.5 if side < 0 else -PI * 0.5)
		if lamp:
			lamp.position = Vector3(rx + float(-side) * 5.8, 0.25, lz)
			lamp.rotation.y = ang
			chunk.add_child(lamp)
			props_pool.append({"node": lamp, "chunk": chunk, "base_x": float(-side) * 5.8, "local_z": lz, "type": "lamp", "hit": false})

	# Market Stall grounded at y = 0.25m
	var stall := _build_grounded_stall()
	var s_side := 1 if (chunk_idx % 2 == 0) else -1
	var s_lz := 30.0
	var s_rx := RoadCurve.get_road_center_x(z_start + s_lz, road_straight)
	stall.position = Vector3(s_rx + float(s_side) * 6.0, 0.25, s_lz)
	chunk.add_child(stall)
	props_pool.append({"node": stall, "chunk": chunk, "base_x": float(s_side) * 6.0, "local_z": s_lz, "type": "stall", "hit": false})

	# Challenge props (Stunt Ramps & Aerial Rings)
	if challenge_mode == "STUNT_RAMPS" and chunk_idx > 0:
		var ramp := _build_stunt_ramp()
		var r_lz := 24.0
		var r_rx := RoadCurve.get_road_center_x(z_start + r_lz, road_straight)
		var lane_x := float((chunk_idx % 3) - 1) * 2.5
		ramp.position = Vector3(r_rx + lane_x, 0.0, r_lz)
		chunk.add_child(ramp)
		props_pool.append({"node": ramp, "chunk": chunk, "base_x": lane_x, "local_z": r_lz, "type": "ramp", "hit": false})

	return chunk


func _build_grounded_stall() -> Node3D:
	var g := Node3D.new()
	var wood_mat := StandardMaterial3D.new()
	wood_mat.albedo_color = Color(0.52, 0.32, 0.16)
	var awning_mat := StandardMaterial3D.new()
	awning_mat.albedo_color = Color(0.92, 0.24, 0.24)

	var table := MeshInstance3D.new()
	var t_box := BoxMesh.new()
	t_box.size = Vector3(1.1, 0.78, 1.9)
	table.mesh = t_box
	table.material_override = wood_mat
	table.position = Vector3(0.0, 0.39, 0.0)
	g.add_child(table)

	for px in [-0.48, 0.48]:
		for pz in [-0.85, 0.85]:
			var pole := MeshInstance3D.new()
			var p_cyl := CylinderMesh.new()
			p_cyl.top_radius = 0.03
			p_cyl.bottom_radius = 0.03
			p_cyl.height = 1.95
			pole.mesh = p_cyl
			pole.position = Vector3(px, 0.975, pz)
			g.add_child(pole)

	var awning := MeshInstance3D.new()
	var a_box := BoxMesh.new()
	a_box.size = Vector3(1.3, 0.08, 2.05)
	awning.mesh = a_box
	awning.material_override = awning_mat
	awning.position = Vector3(0.0, 1.96, 0.0)
	g.add_child(awning)
	return g


func _build_stunt_ramp() -> Node3D:
	var g := Node3D.new()
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(1.0, 0.55, 0.08)
	mat.emission_enabled = true
	mat.emission = Color(1.0, 0.45, 0.05)
	mat.emission_energy_multiplier = 1.4
	var m := MeshInstance3D.new()
	var b := BoxMesh.new()
	b.size = Vector3(2.8, 0.45, 4.2)
	m.mesh = b
	m.material_override = mat
	m.rotation_degrees.x = -14.0
	m.position = Vector3(0.0, 0.25, 0.0)
	g.add_child(m)
	return g


func _build_finish_arch(z_pos: float) -> void:
	finish_arch = Node3D.new()
	var rx := RoadCurve.get_road_center_x(z_pos, road_straight)
	finish_arch.position = Vector3(rx, 0.0, z_pos)
	var gold_mat := StandardMaterial3D.new()
	gold_mat.albedo_color = Color(1.0, 0.82, 0.12)
	gold_mat.emission_enabled = true
	gold_mat.emission = Color(1.0, 0.78, 0.1)
	gold_mat.emission_energy_multiplier = 1.6
	for sx in [-5.6, 5.6]:
		var pillar := MeshInstance3D.new()
		var pc := CylinderMesh.new()
		pc.top_radius = 0.35
		pc.bottom_radius = 0.4
		pc.height = 7.0
		pillar.mesh = pc
		pillar.material_override = gold_mat
		pillar.position = Vector3(sx, 3.5, 0.0)
		finish_arch.add_child(pillar)
	var banner := MeshInstance3D.new()
	var bb := BoxMesh.new()
	bb.size = Vector3(12.2, 1.4, 0.6)
	banner.mesh = bb
	banner.material_override = gold_mat
	banner.position = Vector3(0.0, 6.8, 0.0)
	finish_arch.add_child(banner)
	add_child(finish_arch)


func update_chunks(player_z: float, delta: float) -> void:
	var threshold := player_z - CHUNK_LENGTH
	for i in range(chunks.size()):
		var c := chunks[i]
		if c.position.z + CHUNK_LENGTH < threshold:
			var max_z := -999999.0
			for oc in chunks:
				max_z = maxf(max_z, oc.position.z)
			var new_z := max_z + CHUNK_LENGTH
			var next_idx := int(round(new_z / CHUNK_LENGTH))
			c.queue_free()
			var new_c := _build_chunk(new_z, next_idx)
			chunks[i] = new_c
			add_child(new_c)
			props_pool = props_pool.filter(func(p): return is_instance_valid(p["chunk"]) and p["chunk"] != c)

	for p in props_pool:
		if p.get("hit", false) and is_instance_valid(p.get("node")):
			var n: Node3D = p["node"]
			n.position.y += float(p.get("vy", 0.0)) * delta
			p["vy"] = float(p.get("vy", 0.0)) - 20.0 * delta
			n.position.x += float(p.get("vx", 0.0)) * delta
			n.position.z += float(p.get("vz", 0.0)) * delta
			n.rotation.x += 5.0 * delta
			if n.position.y < -4.0:
				n.visible = false
