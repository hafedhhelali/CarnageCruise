class_name MainController
extends Node3D

@onready var world: WorldBuilder = $WorldBuilder
@onready var player: PlayerVehicle = $PlayerVehicle
@onready var traffic: TrafficManager = $TrafficManager
@onready var peds: PedestrianManager = $PedestrianManager
@onready var camera: Camera3D = $Camera3D
@onready var ui: MainUI = $CanvasLayer/MainUI

var _cinematic_angle: float = 0.0
var _shake_intensity: float = 0.0
var _touch_steer_idx: int = -1
var _touch_start_x: float = 0.0
var _touch_last_x: float = 0.0
var _button_steer: float = 0.0
var _explosion_vfx: GPUParticles3D
var _projectiles: Array[Dictionary] = []
var _debris_pool: Array[Dictionary] = []
var _debris_idx: int = 0
var _proj_mesh: CylinderMesh
var _proj_mat: StandardMaterial3D


func _ready() -> void:
	_init_explosion_vfx()
	_init_projectile_res()
	_init_debris_pool()
	ui.action_triggered.connect(_on_ui_action)
	_apply_city_preview()
	AudioMgr.play_music("MENU")
	ui.show_splash()


func _init_explosion_vfx() -> void:
	_explosion_vfx = GPUParticles3D.new()
	_explosion_vfx.amount = 32
	_explosion_vfx.lifetime = 0.55
	_explosion_vfx.one_shot = true
	_explosion_vfx.explosiveness = 0.92
	_explosion_vfx.emitting = false
	var pm := ParticleProcessMaterial.new()
	pm.direction = Vector3(0.0, 1.0, 0.0)
	pm.spread = 80.0
	pm.initial_velocity_min = 6.0
	pm.initial_velocity_max = 16.0
	pm.gravity = Vector3(0.0, -18.0, 0.0)
	pm.scale_min = 0.35
	pm.scale_max = 0.85
	var sphere := SphereMesh.new()
	sphere.radius = 0.25
	sphere.height = 0.5
	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.albedo_color = Color(1.0, 0.55, 0.12)
	mat.emission_enabled = true
	mat.emission = Color(1.0, 0.45, 0.08)
	mat.emission_energy_multiplier = 2.6
	sphere.material = mat
	_explosion_vfx.process_material = pm
	_explosion_vfx.draw_pass_1 = sphere
	add_child(_explosion_vfx)


func _init_projectile_res() -> void:
	_proj_mesh = CylinderMesh.new()
	_proj_mesh.top_radius = 0.14
	_proj_mesh.bottom_radius = 0.24
	_proj_mesh.height = 2.6
	_proj_mat = StandardMaterial3D.new()
	_proj_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	_proj_mat.albedo_color = Color(1.0, 0.85, 0.2)
	_proj_mat.emission_enabled = true
	_proj_mat.emission = Color(1.0, 0.55, 0.08)
	_proj_mat.emission_energy_multiplier = 3.5
	_proj_mesh.material = _proj_mat


func _spawn_projectile() -> void:
	player.trigger_weapon_recoil()
	var rocket := Node3D.new()
	var body := MeshInstance3D.new()
	var bmesh := CylinderMesh.new()
	bmesh.top_radius = 0.09
	bmesh.bottom_radius = 0.11
	bmesh.height = 0.95
	var bmat := StandardMaterial3D.new()
	bmat.albedo_color = Color(0.24, 0.26, 0.3)
	bmat.metallic = 0.6
	bmesh.material = bmat
	body.mesh = bmesh
	body.rotation_degrees.x = 90.0
	rocket.add_child(body)

	var tip := MeshInstance3D.new()
	var tmesh := CylinderMesh.new()
	tmesh.top_radius = 0.01
	tmesh.bottom_radius = 0.11
	tmesh.height = 0.32
	tmesh.material = _proj_mat
	tip.mesh = tmesh
	tip.rotation_degrees.x = 90.0
	tip.position = Vector3(0.0, 0.0, 0.62)
	rocket.add_child(tip)

	var flame := MeshInstance3D.new()
	var fmesh := SphereMesh.new()
	fmesh.radius = 0.14
	fmesh.height = 0.28
	fmesh.material = _proj_mat
	flame.mesh = fmesh
	flame.position = Vector3(0.0, 0.0, -0.55)
	rocket.add_child(flame)

	var start_pos := player.position + Vector3(0.0, 1.25, 2.0)
	rocket.position = start_pos
	add_child(rocket)
	_projectiles.append({
		"node": rocket,
		"x_offset": player.x_offset,
		"z": player.z_pos + 2.0,
		"y": player.position.y + 1.25,
		"vy": 2.8,
		"life": 0.62
	})


func _init_debris_pool() -> void:
	var d_mesh := BoxMesh.new()
	d_mesh.size = Vector3(0.28, 0.18, 0.34)
	var d_mat := StandardMaterial3D.new()
	d_mat.albedo_color = Color(0.72, 0.42, 0.18)
	d_mat.roughness = 0.8
	for i in range(16):
		var m := MeshInstance3D.new()
		m.mesh = d_mesh
		m.material_override = d_mat
		m.visible = false
		add_child(m)
		_debris_pool.append({"node": m, "active": false, "vx": 0.0, "vy": 0.0, "vz": 0.0, "life": 0.0})


func _spawn_debris(pos: Vector3, count: int = 4) -> void:
	for _i in range(count):
		var d := _debris_pool[_debris_idx]
		_debris_idx = (_debris_idx + 1) % _debris_pool.size()
		var n: MeshInstance3D = d["node"]
		n.position = pos + Vector3(randf_range(-0.4, 0.4), 0.5, randf_range(-0.4, 0.4))
		n.rotation = Vector3(randf() * TAU, randf() * TAU, 0.0)
		n.visible = true
		d["active"] = true
		d["vx"] = randf_range(-8.0, 8.0)
		d["vy"] = randf_range(6.5, 13.0)
		d["vz"] = randf_range(4.0, maxf(10.0, GameData.speed * 0.7))
		d["life"] = 0.85


func _clear_projectiles() -> void:
	for pr in _projectiles:
		if is_instance_valid(pr.get("node")):
			pr["node"].queue_free()
	_projectiles.clear()


func _apply_city_preview() -> void:
	world.setup_city(GameData.selected_city, 1650.0, "STANDARD")
	player.reset_run()
	player.build_vehicle(str(GameData.selected_bike.get("id", "tank")))
	traffic.reset_traffic()
	peds.reset_peds()


func _spawn_burst(pos: Vector3) -> void:
	_explosion_vfx.global_position = pos + Vector3(0.0, 0.6, 0.0)
	_explosion_vfx.restart()


func _on_ui_action(action: String, payload = null) -> void:
	match action:
		"PLAY_CITY":
			var chal := str(payload) if payload != null else "STANDARD"
			_clear_projectiles()
			_touch_steer_idx = -1
			_button_steer = 0.0
			GameData.start_run(str(GameData.selected_city.get("id", "paris")), chal)
			world.setup_city(GameData.selected_city, GameData.finish_distance, chal)
			player.reset_run()
			player.build_vehicle(str(GameData.selected_bike.get("id", "tank")))
			traffic.reset_traffic()
			peds.reset_peds()
			var track := "PURSUIT" if chal == "POLICE_PURSUIT" else ("CATACLYSM" if bool(GameData.selected_city.get("isNuclearMission", false)) else "GAMEPLAY")
			AudioMgr.play_music(track)
			ui.show_hud()
		"SELECT_BIKE":
			var bid := str(payload)
			GameData.select_bike(bid)
			player.build_vehicle(bid)
		"PAUSE":
			GameData.current_mode = "PAUSED"
			AudioMgr.update_engine(0.0, false)
			ui.show_pause_modal()
		"RESUME":
			GameData.current_mode = "PLAYING"
		"TO_MAP":
			GameData.current_mode = "MAP"
			AudioMgr.update_engine(0.0, false)
			AudioMgr.play_music("MENU")
			_apply_city_preview()
			ui.show_map()
		"TO_GARAGE":
			GameData.current_mode = "GARAGE"
			AudioMgr.update_engine(0.0, false)
			ui.show_garage()
		"TO_SPLASH":
			GameData.current_mode = "SPLASH"
			AudioMgr.update_engine(0.0, false)
			AudioMgr.play_music("MENU")
			_apply_city_preview()
			ui.show_splash()
		"NITRO":
			if GameData.nitro_charge >= 25.0 and not GameData.is_nitro_active:
				GameData.is_nitro_active = true
				GameData.nitro_timer = 3.2
				if player.current_bike_id != "cheval":
					AudioMgr.play_sfx("confirm", 1.15, 1.3, -6.0)
		"WEAPON":
			if player.current_bike_id == "cheval":
				player.trigger_jump(GameData.speed)
				AudioMgr.play_sfx("hoof_jump", 0.9, 1.1, -4.0)
				return
			AudioMgr.play_sfx("rocket", 0.95, 1.15, -4.0)
			_trigger_shake(0.18)
			_spawn_projectile()
		"BRAKE":
			GameData.is_braking = bool(payload)
		"STEER_BTN":
			_button_steer = float(payload)


func _trigger_shake(amount: float) -> void:
	if bool(GameData.save_data.get("settings", {}).get("camera_shake", true)):
		_shake_intensity = maxf(_shake_intensity, amount)


func _input(event: InputEvent) -> void:
	if GameData.current_mode != "PLAYING":
		return
	var ctrl_mode := str(GameData.save_data.get("settings", {}).get("control_mode", "swipe"))
	if ctrl_mode == "buttons":
		return
	var vp_h := get_viewport().get_visible_rect().size.y
	if event is InputEventScreenTouch:
		if event.pressed and event.position.y < (vp_h - 118.0):
			_touch_steer_idx = event.index
			_touch_start_x = event.position.x
			_touch_last_x = event.position.x
		elif not event.pressed and event.index == _touch_steer_idx:
			_touch_steer_idx = -1
			player.steer_input = 0.0
	elif event is InputEventScreenDrag and event.index == _touch_steer_idx:
		# Sliding anchor: reversing finger direction immediately reverses steer!
		var delta_move: float = event.position.x - _touch_last_x
		_touch_last_x = event.position.x
		var dx: float = event.position.x - _touch_start_x
		if (dx > 55.0 and delta_move < -2.0) or (dx < -55.0 and delta_move > 2.0):
			_touch_start_x = event.position.x - signf(dx) * 35.0
			dx = event.position.x - _touch_start_x
		elif absf(dx) > 95.0:
			_touch_start_x = event.position.x - signf(dx) * 95.0
			dx = event.position.x - _touch_start_x
		player.steer_input = clampf(-dx / 65.0, -1.0, 1.0)


func _process(delta: float) -> void:
	var dt := minf(delta, 0.05)
	if GameData.current_mode in ["SPLASH", "GARAGE", "MAP"]:
		_cinematic_angle += dt * 0.48
		var r := 5.2
		camera.position = player.position + Vector3(sin(_cinematic_angle) * r, 2.1, cos(_cinematic_angle) * r)
		camera.look_at(player.position + Vector3(0.0, 0.9, 0.0), Vector3.UP)
		camera.fov = 56.0
		return

	if GameData.current_mode != "PLAYING":
		return

	# Keyboard fallback + button steer
	var kb_steer := 0.0
	if Input.is_key_pressed(KEY_LEFT) or Input.is_key_pressed(KEY_A):
		kb_steer += 1.0
	if Input.is_key_pressed(KEY_RIGHT) or Input.is_key_pressed(KEY_D):
		kb_steer -= 1.0
	if absf(kb_steer) > 0.05:
		player.steer_input = kb_steer
	elif absf(_button_steer) > 0.05:
		player.steer_input = _button_steer

	# Nitro & Combo timers
	if GameData.is_nitro_active:
		GameData.nitro_timer -= dt
		GameData.nitro_charge = maxf(0.0, GameData.nitro_charge - dt * 28.0)
		if GameData.nitro_timer <= 0.0 or GameData.nitro_charge <= 0.0:
			GameData.is_nitro_active = false
	else:
		GameData.nitro_charge = minf(100.0, GameData.nitro_charge + dt * 5.0)

	if GameData.combo > 1:
		GameData.combo_timer -= dt
		if GameData.combo_timer <= 0.0:
			GameData.combo = 1

	var target_spd := 0.0 if GameData.is_braking else (GameData.max_speed * (1.38 if GameData.is_nitro_active else 1.0))
	var in_air := player.jump_y > 0.05
	var accel_rate := (6.0 if in_air else 32.0) if GameData.is_braking else 14.0
	GameData.speed = move_toward(GameData.speed, target_spd, accel_rate * dt)
	GameData.distance = player.z_pos

	player.update_vehicle(dt, GameData.speed, world.road_straight)
	AudioMgr.update_engine(GameData.speed / maxf(1.0, GameData.max_speed), true, player.current_bike_id)

	world.update_chunks(player.z_pos, dt)

	# Prop collisions (stands, poles, trees, ramps)
	for p in world.props_pool:
		if p["hit"] or not is_instance_valid(p["node"]):
			continue
		var n: Node3D = p["node"]
		var dz := absf(n.global_position.z - player.position.z)
		var dx := absf(n.global_position.x - player.position.x)
		if p["type"] == "ramp":
			if dz < 2.3 and dx < 1.95:
				p["hit"] = true
				if not GameData.is_braking and GameData.speed >= 8.0:
					if dx >= 0.95:
						var ramp_side := 1.0 if player.position.x >= n.global_position.x else -1.0
						player.trigger_edge_ramp(ramp_side, GameData.speed)
						var r_pts := GameData.add_score(220, false)
						ui.show_floating_pts(r_pts)
					else:
						player.trigger_jump(GameData.speed)
						var r_pts := GameData.add_score(350, false)
						ui.show_floating_pts(r_pts)
		elif dz < 2.2 and dx < 1.8 and player.jump_y < 1.5:
			if player.current_bike_id == "cheval" and p["type"] in ["tree", "lamp"]:
				AudioMgr.play_sfx("bounce_light", 1.0, 1.15, -4.0)
				_trigger_shake(0.2)
				GameData.speed = maxf(4.0, GameData.speed * 0.5)
				var push := -1.0 if player.position.x < n.global_position.x else 1.0
				player.x_offset = clampf(player.x_offset + push * 1.35, -PlayerVehicle.MAX_OFFSET, PlayerVehicle.MAX_OFFSET)
				continue
			p["hit"] = true
			p["vx"] = (1.0 if n.global_position.x >= player.position.x else -1.0) * 9.0
			p["vy"] = 10.0
			p["vz"] = maxf(8.0, GameData.speed * 0.6)
			var sfx_key := "wood_smash" if p["type"] in ["stall", "crate"] else "metal_pole"
			AudioMgr.play_sfx(sfx_key, 0.9, 1.12, -2.0)
			_trigger_shake(0.28 if p["type"] == "stall" else 0.18)
			_spawn_burst(n.global_position)
			_spawn_debris(n.global_position, 4 if p["type"] in ["stall", "crate"] else 2)
			var base_p := 240 if p["type"] == "stall" else (210 if p["type"] == "crate" else 180)
			var pts := GameData.add_score(base_p, false)
			ui.show_floating_pts(pts)

	# Traffic & Pedestrians (reaction depends strictly on selected vehicle!)
	var col_mode := "LIGHT_BOUNCE"
	if player.is_heavy_rammer():
		col_mode = "HEAVY_RAM"
	elif player.current_bike_id == "cheval":
		col_mode = "HORSE_DODGE"
	elif GameData.is_nitro_active:
		col_mode = "NITRO_RAM"
	traffic.update_traffic(dt, player.position, GameData.speed, world.road_straight, col_mode, func(pos: Vector3, mode: String):
		if mode == "HEAVY_RAM":
			AudioMgr.play_sfx("ram_heavy", 0.9, 1.08, 0.0)
			_trigger_shake(0.38)
			_spawn_burst(pos)
			_spawn_debris(pos, 5)
			GameData.speed = maxf(10.0, GameData.speed * 0.92)
			var pts := GameData.add_score(350, true)
			ui.show_floating_pts(pts)
		elif mode == "NITRO_RAM":
			AudioMgr.play_sfx("explosion", 0.92, 1.12, -2.0)
			_trigger_shake(0.32)
			_spawn_burst(pos)
			_spawn_debris(pos, 4)
			GameData.speed = maxf(12.0, GameData.speed * 0.78)
			var pts := GameData.add_score(280, true)
			ui.show_floating_pts(pts)
		elif mode == "LIGHT_BOUNCE":
			AudioMgr.play_sfx("bounce_light", 0.95, 1.15, -2.0)
			_trigger_shake(0.30)
			_spawn_debris(player.position, 2)
			GameData.speed = maxf(4.0, GameData.speed * 0.42)
			player.x_offset = clampf(player.x_offset + pos.x * 1.55, -PlayerVehicle.MAX_OFFSET, PlayerVehicle.MAX_OFFSET)
		else:
			# HORSE_DODGE: car untouched, horse recoils sideways with slight hop
			AudioMgr.play_sfx("hoof_jump", 0.85, 1.0, -3.0)
			_trigger_shake(0.22)
			GameData.speed = maxf(3.5, GameData.speed * 0.45)
			player.x_offset = clampf(player.x_offset + pos.x * 1.65, -PlayerVehicle.MAX_OFFSET, PlayerVehicle.MAX_OFFSET)
	)

	peds.update_peds(dt, player.position, GameData.speed, world.road_straight, func(pos: Vector3):
		AudioMgr.play_sfx("ped_hit", 0.92, 1.12, -4.0)
		_trigger_shake(0.16)
		_spawn_burst(pos)
		var pts := GameData.add_score(150, true)
		ui.show_floating_pts(pts)
	)

	_update_projectiles(dt)
	_update_debris(dt)

	# Camera follow + steering anticipation + trauma shake
	var target_cam := player.position + Vector3(-player.smoothed_steer * 0.75, 4.9, -10.4)
	camera.position = camera.position.lerp(target_cam, clampf(dt * 10.0, 0.0, 1.0))
	if _shake_intensity > 0.005:
		camera.position += Vector3(randf_range(-1.0, 1.0), randf_range(-0.6, 0.6), 0.0) * _shake_intensity
		_shake_intensity = maxf(0.0, _shake_intensity - dt * 1.4)
	camera.look_at(player.position + Vector3(player.smoothed_steer * 0.6, 1.3, 16.0), Vector3.UP)
	camera.rotation.z = lerpf(camera.rotation.z, player.smoothed_steer * 0.035, clampf(dt * 6.0, 0.0, 1.0))
	var target_fov := 70.0 + clampf(GameData.speed / 3.5, 0.0, 12.0) + (6.0 if GameData.is_nitro_active else 0.0)
	camera.fov = lerpf(camera.fov, target_fov, clampf(dt * 6.0, 0.0, 1.0))

	ui.update_hud()

	# Finish Check
	if player.z_pos >= world.finish_distance:
		_clear_projectiles()
		AudioMgr.update_engine(0.0, false)
		AudioMgr.play_sfx("victory", 0.95, 1.05, 1.0)
		var summary := GameData.end_run(true)
		ui.show_results_modal(summary)


func _update_projectiles(dt: float) -> void:
	for i in range(_projectiles.size() - 1, -1, -1):
		var pr := _projectiles[i]
		var n: Node3D = pr["node"]
		pr["life"] = float(pr["life"]) - dt
		pr["z"] = float(pr["z"]) + (75.0 + GameData.speed) * dt
		pr["vy"] = float(pr["vy"]) - 14.5 * dt
		pr["y"] = float(pr["y"]) + float(pr["vy"]) * dt
		var pz: float = pr["z"]
		var py: float = pr["y"]
		var px := RoadCurve.get_road_center_x(pz, world.road_straight) + float(pr["x_offset"])
		n.position = Vector3(px, py, pz)
		n.rotation.y = RoadCurve.get_road_angle(pz, world.road_straight)
		n.rotation.x = clampf(-float(pr["vy"]) * 0.04, -0.35, 0.35)

		var hit := false
		for v in traffic.vehicles:
			if v["active"] and not v["crashed"]:
				var vn: Node3D = v["node"]
				if absf(vn.position.z - pz) < 3.6 and absf(vn.position.x - px) < 2.6:
					v["crashed"] = true
					v["vy"] = 14.0
					v["vz"] = 18.0
					v["vx"] = (1.0 if randf() > 0.5 else -1.0) * 10.0
					AudioMgr.play_sfx("explosion", 0.88, 1.12, 1.0)
					_trigger_shake(0.32)
					_spawn_burst(vn.position)
					var pts := GameData.add_score(450, true)
					ui.show_floating_pts(pts)
					hit = true
					break
		if hit or py <= 0.25 or float(pr["life"]) <= 0.0:
			if not hit:
				AudioMgr.play_sfx("explosion", 1.0, 1.25, -4.0)
				_spawn_burst(Vector3(px, 0.25, pz))
			n.queue_free()
			_projectiles.remove_at(i)


func _update_debris(dt: float) -> void:
	for d in _debris_pool:
		if not d["active"]:
			continue
		d["life"] = float(d["life"]) - dt
		var n: MeshInstance3D = d["node"]
		n.position += Vector3(float(d["vx"]), float(d["vy"]), float(d["vz"])) * dt
		d["vy"] = float(d["vy"]) - 24.0 * dt
		n.rotation.x += 8.0 * dt
		n.rotation.y += 6.0 * dt
		if float(d["life"]) <= 0.0 or n.position.y < -1.0:
			d["active"] = false
			n.visible = false
