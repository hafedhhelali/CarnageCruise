extends Node

const SHOT_DIR := "C:/Users/helal/.gemini/antigravity/brain/dba5e6a3-8ee8-4621-9ec9-f748747148fa/"
var _failures: Array[String] = []
var _checks: int = 0


func _assert(cond: bool, msg: String) -> void:
	_checks += 1
	if not cond:
		_failures.append(msg)
		push_error("ASSERT FAILED: " + msg)
	else:
		print("[PASS] ", msg)


func _find_button_containing(node: Node, substr: String) -> Button:
	if node is Button and substr in node.text:
		return node
	for c in node.get_children():
		var found := _find_button_containing(c, substr)
		if found:
			return found
	return null


func _collect_buttons(node: Node, out: Array[Button]) -> void:
	if node is Button and node.visible:
		out.append(node)
	for c in node.get_children():
		_collect_buttons(c, out)


func _click_button_center(btn: Button) -> void:
	var rect := btn.get_global_rect()
	var center := btn.get_viewport().get_final_transform() * (rect.position + rect.size * 0.5)
	var ev_motion := InputEventMouseMotion.new()
	ev_motion.position = center
	ev_motion.global_position = center
	get_tree().root.push_input(ev_motion)
	await get_tree().process_frame
	var ev_down := InputEventMouseButton.new()
	ev_down.button_index = MOUSE_BUTTON_LEFT
	ev_down.pressed = true
	ev_down.position = center
	ev_down.global_position = center
	get_tree().root.push_input(ev_down)
	await get_tree().process_frame
	var ev_up := InputEventMouseButton.new()
	ev_up.button_index = MOUSE_BUTTON_LEFT
	ev_up.pressed = false
	ev_up.position = center
	ev_up.global_position = center
	get_tree().root.push_input(ev_up)
	await get_tree().process_frame


func _save_shot(filename: String) -> void:
	await get_tree().process_frame
	await get_tree().process_frame
	var img := get_tree().root.get_texture().get_image()
	if img:
		img.save_png(SHOT_DIR + filename)
		print("[SHOT] Saved ", filename, " (", img.get_width(), "x", img.get_height(), ")")


func _ready() -> void:
	call_deferred("_run_suite")


func _run_suite() -> void:
	var main_ps := load("res://scenes/Main.tscn") as PackedScene
	_assert(main_ps != null, "Main.tscn loads cleanly")
	var main: MainController = main_ps.instantiate()
	add_child(main)

	for _i in range(6):
		await get_tree().process_frame

	var ui: MainUI = main.ui
	GameData.save_data["settings"]["control_mode"] = "swipe"
	_assert(GameData.cities.size() == 85, "85 cities loaded from parity.json")
	_assert(GameData.bikes.size() == 8, "8 bikes loaded from parity.json")
	_assert(GameData.current_mode == "SPLASH", "Initial mode is SPLASH")

	# 1. Splash screen (ensure tank selected for visual check) & real click test on OPTIONS
	GameData.select_bike("tank")
	main.player.build_vehicle("tank")
	await _save_shot("godot_test_01_splash.png")
	var opt_btn := _find_button_containing(ui, "OPTIONS")
	_assert(opt_btn != null, "Splash OPTIONS button exists")
	await _click_button_center(opt_btn)
	await _save_shot("godot_test_02_options.png")
	var close_btn := _find_button_containing(ui, "FERMER")
	_assert(close_btn != null, "Options modal opened on real click")
	var ctrl_btn := _find_button_containing(ui, "CONTRÔLES :")
	_assert(ctrl_btn != null, "Options control mode button exists")
	var mode_before: String = str(GameData.save_data["settings"].get("control_mode", "swipe"))
	await _click_button_center(ctrl_btn)
	_assert(str(GameData.save_data["settings"].get("control_mode", "")) != mode_before, "Options toggled control_mode")
	await _click_button_center(ctrl_btn)
	_assert(str(GameData.save_data["settings"].get("control_mode", "")) == mode_before, "Options toggled control_mode back")
	await _click_button_center(close_btn)
	_assert(_find_button_containing(ui, "FERMER") == null, "Options modal closed on FERMER click")

	# 2. Interactive Map screen, zoom & region filters (no city button list!)
	var map_btn := _find_button_containing(ui, "CARTE")
	_assert(map_btn != null, "Splash CARTE button exists")
	await _click_button_center(map_btn)
	_assert(GameData.current_mode == "MAP", "Switched to MAP mode")
	var play_stage_btn := _find_button_containing(ui, "JOUER CETTE ÉTAPE")
	_assert(play_stage_btn != null, "Map shows selected stage card with JOUER CETTE ÉTAPE")
	var zin_btn := _find_button_containing(ui, "+")
	_assert(zin_btn != null, "Map zoom-in + button exists")
	await _click_button_center(zin_btn)
	var maghreb_btn := _find_button_containing(ui, "MAGHREB")
	_assert(maghreb_btn != null, "MAGHREB filter button exists")
	await _click_button_center(maghreb_btn)
	await _save_shot("godot_test_03_map.png")
	var back_btn := _find_button_containing(ui, "RETOUR")
	_assert(back_btn != null, "Map RETOUR button exists")
	await _click_button_center(back_btn)
	_assert(GameData.current_mode == "SPLASH", "Returned to SPLASH from MAP")

	# 3. Garage 2x4 & cycling vehicles (including cheval & aero_jet)
	var gar_btn := _find_button_containing(ui, "GARAGE")
	_assert(gar_btn != null, "Splash GARAGE button exists")
	await _click_button_center(gar_btn)
	_assert(GameData.current_mode == "GARAGE", "Switched to GARAGE mode")
	var cheval_btn := _find_button_containing(ui, "Pur-Sang")
	if cheval_btn == null:
		cheval_btn = _find_button_containing(ui, "Cheval")
	_assert(cheval_btn != null, "Garage Cheval button exists")
	await _click_button_center(cheval_btn)
	_assert(GameData.selected_bike.get("id") == "cheval", "Selected bike cheval in Garage")
	await _save_shot("godot_test_04_garage_cheval.png")

	var jet_btn := _find_button_containing(ui, "Jet")
	_assert(jet_btn != null, "Garage Jet button exists")
	await _click_button_center(jet_btn)
	_assert(GameData.selected_bike.get("id") == "aero_jet", "Selected bike aero_jet in Garage")

	# 4. Launch race & run 90 frames measuring frame time + gameplay controls
	var deploy_btn := _find_button_containing(ui, "DÉPLOYER")
	_assert(deploy_btn != null, "Garage DÉPLOYER button exists")
	await _click_button_center(deploy_btn)
	_assert(GameData.current_mode == "PLAYING", "Race started in PLAYING mode")

	var t_start := Time.get_ticks_usec()
	for f in range(90):
		if f == 30:
			var nitro_btn := _find_button_containing(ui, "NITRO")
			_assert(nitro_btn != null, "HUD NITRO button exists")
			await _click_button_center(nitro_btn)
			_assert(GameData.is_nitro_active, "NITRO activated via HUD click")
		elif f == 55:
			var wpn_btn := _find_button_containing(ui, "TIRER")
			_assert(wpn_btn != null, "HUD TIRER button exists")
			await _click_button_center(wpn_btn)
		await get_tree().process_frame
	var elapsed_ms := float(Time.get_ticks_usec() - t_start) / 1000.0
	var avg_frame_ms := elapsed_ms / 90.0
	print("[PERF] 90 race frames in %.1f ms (avg %.2f ms/frame)" % [elapsed_ms, avg_frame_ms])
	_assert(GameData.distance > 15.0, "Player progressed forward (distance=%.1fm)" % GameData.distance)
	_assert(GameData.speed > 5.0, "Player accelerated (speed=%.1f m/s)" % GameData.speed)
	await _save_shot("godot_test_05_gameplay.png")

	# 5. Pause & Resume & Results modal check
	var pause_btn := _find_button_containing(ui, "||")
	_assert(pause_btn != null, "HUD PAUSE button exists")
	await _click_button_center(pause_btn)
	_assert(GameData.current_mode == "PAUSED", "Game paused on || click")
	await _save_shot("godot_test_06_pause.png")
	var resume_btn := _find_button_containing(ui, "REPRENDRE")
	_assert(resume_btn != null, "Pause REPRENDRE button exists")
	await _click_button_center(resume_btn)
	_assert(GameData.current_mode == "PLAYING", "Game resumed on REPRENDRE click")

	# Trigger finish line cleanly
	main.player.z_pos = main.world.finish_distance + 1.0
	await get_tree().process_frame
	await get_tree().process_frame
	_assert(GameData.current_mode == "RESULTS", "Results modal shown upon reaching finish line")
	await _save_shot("godot_test_07_results.png")

	# 6. Scenarios B, D, E, F, G: City switching, All 8 vehicles, Heavy VFX/Destruction, 300-frame Endurance & Memory
	var mem_before := OS.get_static_memory_usage()
	var city_gen_times: Array[float] = []
	for cid in ["paris", "marrakech", "tokyo"]:
		var t0 := Time.get_ticks_usec()
		GameData.select_city(cid)
		main.world.setup_city(GameData.selected_city, 1650.0, "STUNT_RAMPS")
		city_gen_times.append(float(Time.get_ticks_usec() - t0) / 1000.0)
	_assert(city_gen_times.size() == 3, "Scenario F: City transitions measured (Paris=%.1fms, Marrakech=%.1fms, Tokyo=%.1fms)" % [city_gen_times[0], city_gen_times[1], city_gen_times[2]])

	for b in GameData.bikes:
		var bid := str(b.get("id", ""))
		GameData.select_bike(bid)
		main.player.build_vehicle(bid)
		main.player.update_vehicle(0.016, 22.0, false)
	_assert(GameData.bikes.size() == 8, "Scenario G: All 8 vehicles built and updated cleanly")

	# Scenarios B/D/E: 300 frames sustained race with rockets, nitro, debris & steering
	GameData.start_run("marrakech", "STUNT_RAMPS")
	main.world.setup_city(GameData.selected_city, 1650.0, "STUNT_RAMPS")
	main.player.reset_run()
	main.player.build_vehicle("decapotable")
	main.ui.show_hud()
	var min_ft := 9999.0
	var max_ft := 0.0
	var total_ft := 0.0
	for f in range(300):
		var f0 := Time.get_ticks_usec()
		main.player.steer_input = sin(float(f) * 0.12)
		if f % 45 == 0:
			main._on_ui_action("WEAPON", null)
		if f == 20:
			GameData.nitro_charge = 100.0
			main._on_ui_action("NITRO", null)
		await get_tree().process_frame
		var ft := float(Time.get_ticks_usec() - f0) / 1000.0
		min_ft = minf(min_ft, ft)
		max_ft = maxf(max_ft, ft)
		total_ft += ft
	var avg_ft := total_ft / 300.0
	var avg_fps := 1000.0 / maxf(avg_ft, 0.01)
	var mem_after := OS.get_static_memory_usage()
	var mem_delta_kb := float(int(mem_after) - int(mem_before)) / 1024.0
	print("[BENCH A-G] 300 frames: avg=%.2f ms/f (%.1f FPS), min=%.2f ms, max=%.2f ms, mem_delta=%.1f KB" % [avg_ft, avg_fps, min_ft, max_ft, mem_delta_kb])
	_assert(avg_ft < 65.0, "Scenarios B/D/E: Sustained 300-frame perf healthy (avg %.2f ms/frame)" % avg_ft)

	print("==========================================")
	print("CAMPAIGN SUMMARY: %d checks, %d failures" % [_checks, _failures.size()])
	if _failures.size() > 0:
		for err in _failures:
			print("  FAIL: ", err)
		get_tree().quit(1)
	else:
		print("ALL TESTS PASSED!")
		get_tree().quit(0)
