class_name MainUI
extends Control

signal action_triggered(action: String, payload)

var _screen_root: Control
var _hud_score: Label
var _hud_combo: Label
var _hud_speed: Label
var _hud_kills: Label
var _hud_progress: ProgressBar
var _hud_nitro_bar: ProgressBar
var _hud_float_lbl: Label
var _map_region_filter := "TOUTES"


func _ready() -> void:
	set_anchors_preset(PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	_screen_root = Control.new()
	_screen_root.set_anchors_preset(PRESET_FULL_RECT)
	_screen_root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_screen_root)


func _clear() -> void:
	for c in _screen_root.get_children():
		c.queue_free()


func _make_btn(text: String, bg: Color, min_h: int = 52) -> Button:
	var btn := Button.new()
	btn.text = text
	btn.custom_minimum_size = Vector2(0, min_h)
	btn.add_theme_font_size_override("font_size", 16)
	var sb := StyleBoxFlat.new()
	sb.bg_color = bg
	sb.set_corner_radius_all(18)
	sb.set_border_width_all(2)
	sb.border_color = bg.lightened(0.42)
	sb.shadow_color = Color(0, 0, 0, 0.35)
	sb.shadow_size = 4
	sb.shadow_offset = Vector2(0, 2)
	var sb_hover := sb.duplicate()
	sb_hover.bg_color = bg.lightened(0.12)
	var sb_press := sb.duplicate()
	sb_press.bg_color = bg.darkened(0.18)
	sb_press.shadow_size = 1
	btn.add_theme_stylebox_override("normal", sb)
	btn.add_theme_stylebox_override("hover", sb_hover)
	btn.add_theme_stylebox_override("pressed", sb_press)
	btn.pressed.connect(func(): AudioMgr.play_sfx("click"))
	return btn


func _make_panel(bg: Color = Color(0.06, 0.09, 0.16, 0.88)) -> PanelContainer:
	var p := PanelContainer.new()
	var sb := StyleBoxFlat.new()
	sb.bg_color = bg
	sb.corner_radius_top_left = 16
	sb.corner_radius_top_right = 16
	sb.corner_radius_bottom_left = 16
	sb.corner_radius_bottom_right = 16
	sb.border_width_left = 2
	sb.border_width_top = 2
	sb.border_width_right = 2
	sb.border_width_bottom = 2
	sb.border_color = Color(0.2, 0.78, 0.92, 0.55)
	sb.content_margin_left = 16
	sb.content_margin_right = 16
	sb.content_margin_top = 14
	sb.content_margin_bottom = 14
	p.add_theme_stylebox_override("panel", sb)
	return p


func show_splash() -> void:
	_clear()
	var vbox := VBoxContainer.new()
	vbox.set_anchors_preset(PRESET_FULL_RECT)
	vbox.add_theme_constant_override("separation", 14)
	vbox.offset_left = 24
	vbox.offset_right = -24
	vbox.offset_top = 36
	vbox.offset_bottom = -28
	_screen_root.add_child(vbox)

	var top_bar := HBoxContainer.new()
	var ver := Label.new()
	ver.text = "CARNAGE CRUISE  •  GODOT VULKAN v1.0.2"
	ver.add_theme_font_size_override("font_size", 14)
	ver.modulate = Color(0.55, 0.9, 1.0)
	var coins := Label.new()
	coins.text = "  |  OR: %d" % int(GameData.save_data.get("coins", 0))
	coins.add_theme_font_size_override("font_size", 14)
	coins.modulate = Color(1.0, 0.85, 0.2)
	top_bar.add_child(ver)
	top_bar.add_child(coins)
	vbox.add_child(top_bar)

	var title := Label.new()
	title.text = "CARNAGE CRUISE"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 38)
	title.modulate = Color(1.0, 0.92, 0.35)
	vbox.add_child(title)

	var spacer := Control.new()
	spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
	spacer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	vbox.add_child(spacer)

	var info_card := _make_panel()
	var iv := VBoxContainer.new()
	iv.add_theme_constant_override("separation", 6)
	var city_lbl := Label.new()
	city_lbl.text = "ÉTAPE : %s (%s)" % [str(GameData.selected_city.get("name", "Paris")).to_upper(), GameData.get_city_biome(GameData.selected_city).to_upper()]
	city_lbl.add_theme_font_size_override("font_size", 17)
	var bike_row := HBoxContainer.new()
	bike_row.add_theme_constant_override("separation", 8)
	var prev_b := _make_btn("<", Color(0.18, 0.28, 0.42), 38)
	prev_b.custom_minimum_size = Vector2(44, 38)
	prev_b.pressed.connect(func():
		var idx := GameData.bikes.find(GameData.selected_bike)
		var prev_idx := (idx - 1 + GameData.bikes.size()) % maxi(1, GameData.bikes.size())
		action_triggered.emit("SELECT_BIKE", str(GameData.bikes[prev_idx].get("id", "tank")))
		show_splash()
	)
	var bike_lbl := Label.new()
	bike_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	bike_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	bike_lbl.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	bike_lbl.text = "%s (%d km/h)" % [str(GameData.selected_bike.get("name", "Tank")), int(round(float(GameData.selected_bike.get("maxSpeed", 20.0)) * 3.6))]
	bike_lbl.modulate = Color(0.45, 0.92, 1.0)
	var next_b := _make_btn(">", Color(0.18, 0.28, 0.42), 38)
	next_b.custom_minimum_size = Vector2(44, 38)
	next_b.pressed.connect(func():
		var idx := GameData.bikes.find(GameData.selected_bike)
		var next_idx := (idx + 1) % maxi(1, GameData.bikes.size())
		action_triggered.emit("SELECT_BIKE", str(GameData.bikes[next_idx].get("id", "tank")))
		show_splash()
	)
	bike_row.add_child(prev_b)
	bike_row.add_child(bike_lbl)
	bike_row.add_child(next_b)
	iv.add_child(city_lbl)
	iv.add_child(bike_row)
	info_card.add_child(iv)
	vbox.add_child(info_card)

	var play_btn := _make_btn("LANCER L'ASSAUT", Color(0.88, 0.18, 0.32), 62)
	play_btn.pressed.connect(func(): action_triggered.emit("PLAY_CITY", "STANDARD"))
	vbox.add_child(play_btn)

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 10)
	var map_btn := _make_btn("CARTE (%d)" % GameData.cities.size(), Color(0.08, 0.45, 0.78), 52)
	map_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	map_btn.pressed.connect(func(): action_triggered.emit("TO_MAP", null))
	var gar_btn := _make_btn("GARAGE (8)", Color(0.14, 0.52, 0.48), 52)
	gar_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	gar_btn.pressed.connect(func(): action_triggered.emit("TO_GARAGE", null))
	row.add_child(map_btn)
	row.add_child(gar_btn)
	vbox.add_child(row)

	var opt_btn := _make_btn("OPTIONS AUDIO & CONTRÔLES", Color(0.22, 0.26, 0.36), 46)
	opt_btn.pressed.connect(show_options_modal)
	vbox.add_child(opt_btn)


func show_map() -> void:
	_clear()
	var vbox := VBoxContainer.new()
	vbox.set_anchors_preset(PRESET_FULL_RECT)
	vbox.offset_left = 18
	vbox.offset_right = -18
	vbox.offset_top = 24
	vbox.offset_bottom = -20
	vbox.add_theme_constant_override("separation", 10)
	_screen_root.add_child(vbox)

	var hdr_panel := _make_panel(Color(0.06, 0.09, 0.16, 0.92))
	var hdr := HBoxContainer.new()
	hdr.add_theme_constant_override("separation", 10)
	var back := _make_btn("RETOUR", Color(0.25, 0.3, 0.4), 42)
	back.custom_minimum_size = Vector2(96, 42)
	back.add_theme_font_size_override("font_size", 14)
	back.pressed.connect(func(): action_triggered.emit("TO_SPLASH", null))
	var ttl := Label.new()
	ttl.text = "CARTE (%d VILLES)" % GameData.cities.size()
	ttl.add_theme_font_size_override("font_size", 17)
	ttl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	ttl.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	hdr.add_child(back)
	hdr.add_child(ttl)
	hdr_panel.add_child(hdr)
	vbox.add_child(hdr_panel)

	var filter_row := HBoxContainer.new()
	filter_row.add_theme_constant_override("separation", 6)
	for reg in ["TOUTES", "EUROPE", "AFRIQUE DU NORD", "PROCHE-ORIENT"]:
		var lbl: String = "MAGHREB" if reg == "AFRIQUE DU NORD" else ("LEVANT" if reg == "PROCHE-ORIENT" else reg)
		var fb := _make_btn(lbl, Color(0.12, 0.62, 0.72) if _map_region_filter == reg else Color(0.18, 0.22, 0.32), 40)
		fb.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		fb.add_theme_font_size_override("font_size", 13)
		fb.pressed.connect(func():
			_map_region_filter = reg
			show_map()
		)
		filter_row.add_child(fb)
	vbox.add_child(filter_row)

	var filtered_cities: Array = []
	var sel_in_filter := false
	var cur_sel_id := str(GameData.selected_city.get("id", "paris"))
	for c in GameData.cities:
		if _map_region_filter == "TOUTES" or GameData.get_city_region(c) == _map_region_filter:
			filtered_cities.append(c)
			if str(c.get("id", "")) == cur_sel_id:
				sel_in_filter = true
	if not sel_in_filter and filtered_cities.size() > 0:
		GameData.select_city(str(filtered_cities[0].get("id", "paris")))

	var map_wrap := Control.new()
	map_wrap.size_flags_vertical = Control.SIZE_EXPAND_FILL
	vbox.add_child(map_wrap)

	var map_canvas := MapCanvas.new()
	map_canvas.set_anchors_preset(PRESET_FULL_RECT)
	map_canvas.set_data(filtered_cities, str(GameData.selected_city.get("id", "paris")), false)
	map_wrap.add_child(map_canvas)

	# Zoom + / - floating controls on Map
	var zoom_col := VBoxContainer.new()
	zoom_col.set_anchors_preset(PRESET_TOP_RIGHT)
	zoom_col.offset_left = -58
	zoom_col.offset_right = -10
	zoom_col.offset_top = 10
	zoom_col.offset_bottom = 110
	zoom_col.add_theme_constant_override("separation", 6)
	var zin := _make_btn("+", Color(0.1, 0.24, 0.42, 0.9), 42)
	zin.pressed.connect(func(): map_canvas.zoom_by(1.35))
	var zout := _make_btn("-", Color(0.1, 0.24, 0.42, 0.9), 42)
	zout.pressed.connect(func(): map_canvas.zoom_by(1.0 / 1.35))
	zoom_col.add_child(zin)
	zoom_col.add_child(zout)
	map_wrap.add_child(zoom_col)

	# Bottom Selected City Card (no city button list!)
	var city_card := _make_panel(Color(0.05, 0.09, 0.16, 0.95))
	var cv := VBoxContainer.new()
	cv.add_theme_constant_override("separation", 8)
	var c_title := Label.new()
	c_title.add_theme_font_size_override("font_size", 19)
	c_title.modulate = Color(1.0, 0.9, 0.35)
	var c_sub := Label.new()
	c_sub.add_theme_font_size_override("font_size", 13)
	c_sub.modulate = Color(0.75, 0.88, 1.0)
	var play_city_btn := _make_btn("JOUER CETTE ÉTAPE", Color(0.88, 0.18, 0.32), 52)
	var update_card := func():
		var sel := GameData.selected_city
		var cid := str(sel.get("id", "paris"))
		var stars := int(GameData.save_data["city_stars"].get(cid, 0))
		c_title.text = "%s (%s)  ★%d/3" % [str(sel.get("name", "Paris")).to_upper(), str(sel.get("country", "")), stars]
		c_sub.text = "%s • Biome: %s" % [str(sel.get("monument", "")), GameData.get_city_biome(sel).to_upper()]
	update_card.call()
	map_canvas.city_selected.connect(func(cid: String):
		GameData.select_city(cid)
		update_card.call()
	)
	map_canvas.city_play_requested.connect(func(cid: String):
		GameData.select_city(cid)
		action_triggered.emit("PLAY_CITY", "STUNT_RAMPS" if (cid.hash() % 3 == 0) else "STANDARD")
	)
	play_city_btn.pressed.connect(func():
		var cid := str(GameData.selected_city.get("id", "paris"))
		action_triggered.emit("PLAY_CITY", "STUNT_RAMPS" if (cid.hash() % 3 == 0) else "STANDARD")
	)
	cv.add_child(c_title)
	cv.add_child(c_sub)
	cv.add_child(play_city_btn)
	city_card.add_child(cv)
	vbox.add_child(city_card)


func show_garage() -> void:
	_clear()
	var vbox := VBoxContainer.new()
	vbox.set_anchors_preset(PRESET_FULL_RECT)
	vbox.offset_left = 18
	vbox.offset_right = -18
	vbox.offset_top = 24
	vbox.offset_bottom = -20
	vbox.add_theme_constant_override("separation", 10)
	_screen_root.add_child(vbox)

	var hdr_panel := _make_panel(Color(0.06, 0.09, 0.16, 0.92))
	var hdr := HBoxContainer.new()
	hdr.add_theme_constant_override("separation", 10)
	var back := _make_btn("RETOUR", Color(0.25, 0.3, 0.4), 42)
	back.custom_minimum_size = Vector2(96, 42)
	back.add_theme_font_size_override("font_size", 14)
	back.pressed.connect(func(): action_triggered.emit("TO_SPLASH", null))
	var ttl := Label.new()
	ttl.text = "GARAGE (8 ENGINS)"
	ttl.add_theme_font_size_override("font_size", 17)
	ttl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	ttl.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	hdr.add_child(back)
	hdr.add_child(ttl)
	hdr_panel.add_child(hdr)
	vbox.add_child(hdr_panel)

	var spacer := Control.new()
	spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
	spacer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	vbox.add_child(spacer)

	var grid := GridContainer.new()
	grid.columns = 2
	grid.add_theme_constant_override("h_separation", 8)
	grid.add_theme_constant_override("v_separation", 8)
	for b in GameData.bikes:
		var bid := str(b.get("id", ""))
		var active := bid == str(GameData.selected_bike.get("id", ""))
		var btn := _make_btn("%s\n%d km/h" % [str(b.get("name", bid)), int(round(float(b.get("maxSpeed", 20.0)) * 3.6))], Color(0.1, 0.6, 0.46) if active else Color(0.14, 0.2, 0.32), 62)
		btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		btn.add_theme_font_size_override("font_size", 14)
		btn.pressed.connect(func():
			action_triggered.emit("SELECT_BIKE", bid)
			show_garage()
		)
		grid.add_child(btn)
	vbox.add_child(grid)

	var race_btn := _make_btn("DÉPLOYER CET ENGIN", Color(0.88, 0.18, 0.32), 56)
	race_btn.pressed.connect(func(): action_triggered.emit("PLAY_CITY", "STANDARD"))
	vbox.add_child(race_btn)


func show_hud() -> void:
	_clear()
	var root := Control.new()
	root.set_anchors_preset(PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_screen_root.add_child(root)

	# Top HUD
	var top := HBoxContainer.new()
	top.set_anchors_preset(PRESET_TOP_WIDE)
	top.mouse_filter = Control.MOUSE_FILTER_IGNORE
	top.offset_left = 14
	top.offset_right = -14
	top.offset_top = 18
	top.offset_bottom = 86
	top.add_theme_constant_override("separation", 10)
	root.add_child(top)

	var score_panel := _make_panel()
	score_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var sv := VBoxContainer.new()
	sv.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_hud_score = Label.new()
	_hud_score.text = "0"
	_hud_score.add_theme_font_size_override("font_size", 22)
	_hud_combo = Label.new()
	_hud_combo.text = "COMBO x1"
	_hud_combo.modulate = Color(1.0, 0.78, 0.2)
	sv.add_child(_hud_score)
	sv.add_child(_hud_combo)
	score_panel.add_child(sv)
	top.add_child(score_panel)

	var prog_panel := _make_panel()
	prog_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	prog_panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var pv := VBoxContainer.new()
	pv.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var cname := Label.new()
	var target_sc := int(GameData.selected_city.get("targetScore", 26000))
	cname.text = "%s (%dm) • Obj %dk" % [str(GameData.selected_city.get("name", "PARIS")).to_upper(), int(GameData.finish_distance), int(target_sc / 1000)]
	cname.add_theme_font_size_override("font_size", 13)
	cname.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_hud_progress = ProgressBar.new()
	_hud_progress.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_hud_progress.max_value = 100.0
	_hud_progress.custom_minimum_size.y = 18
	pv.add_child(cname)
	pv.add_child(_hud_progress)
	prog_panel.add_child(pv)
	top.add_child(prog_panel)

	var pause_btn := _make_btn("||", Color(0.18, 0.24, 0.36), 54)
	pause_btn.custom_minimum_size.x = 54
	pause_btn.pressed.connect(func(): action_triggered.emit("PAUSE", null))
	top.add_child(pause_btn)

	_hud_float_lbl = Label.new()
	_hud_float_lbl.set_anchors_preset(PRESET_CENTER)
	_hud_float_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_hud_float_lbl.add_theme_font_size_override("font_size", 28)
	_hud_float_lbl.modulate = Color(1.0, 0.9, 0.25, 0.0)
	root.add_child(_hud_float_lbl)

	# Optional Left/Right buttons if control_mode == buttons
	if str(GameData.save_data.get("settings", {}).get("control_mode", "swipe")) == "buttons":
		var steer_row := HBoxContainer.new()
		steer_row.set_anchors_preset(PRESET_BOTTOM_WIDE)
		steer_row.offset_left = 18
		steer_row.offset_right = -18
		steer_row.offset_top = -195
		steer_row.offset_bottom = -125
		var lbtn := _make_btn("◀", Color(0.12, 0.22, 0.38), 64)
		lbtn.custom_minimum_size.x = 84
		lbtn.button_down.connect(func(): action_triggered.emit("STEER_BTN", 1.0))
		lbtn.button_up.connect(func(): action_triggered.emit("STEER_BTN", 0.0))
		var sp := Control.new()
		sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		sp.mouse_filter = Control.MOUSE_FILTER_IGNORE
		var rbtn := _make_btn("▶", Color(0.12, 0.22, 0.38), 64)
		rbtn.custom_minimum_size.x = 84
		rbtn.button_down.connect(func(): action_triggered.emit("STEER_BTN", -1.0))
		rbtn.button_up.connect(func(): action_triggered.emit("STEER_BTN", 0.0))
		steer_row.add_child(lbtn)
		steer_row.add_child(sp)
		steer_row.add_child(rbtn)
		root.add_child(steer_row)

	# Bottom Ergonomic Thumb Zones (ample spacing, clear center road view)
	var bot := HBoxContainer.new()
	bot.set_anchors_preset(PRESET_BOTTOM_WIDE)
	bot.offset_left = 16
	bot.offset_right = -16
	bot.offset_top = -104
	bot.offset_bottom = -18
	bot.add_theme_constant_override("separation", 12)
	bot.alignment = BoxContainer.ALIGNMENT_CENTER
	root.add_child(bot)

	var brake := _make_btn("FREIN", Color(0.76, 0.14, 0.24, 0.92), 66)
	brake.custom_minimum_size = Vector2(92, 66)
	brake.button_down.connect(func(): action_triggered.emit("BRAKE", true))
	brake.button_up.connect(func(): action_triggered.emit("BRAKE", false))
	bot.add_child(brake)

	var mid := _make_panel(Color(0.05, 0.08, 0.14, 0.72))
	mid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var mv := VBoxContainer.new()
	mv.alignment = BoxContainer.ALIGNMENT_CENTER
	_hud_speed = Label.new()
	_hud_speed.text = "0 KM/H"
	_hud_speed.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_hud_speed.add_theme_font_size_override("font_size", 20)
	_hud_kills = Label.new()
	_hud_kills.text = "0 VICTIMES"
	_hud_kills.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_hud_kills.add_theme_font_size_override("font_size", 13)
	_hud_kills.modulate = Color(1.0, 0.52, 0.56)
	mv.add_child(_hud_speed)
	mv.add_child(_hud_kills)
	mid.add_child(mv)
	bot.add_child(mid)

	var right_col := VBoxContainer.new()
	right_col.add_theme_constant_override("separation", 6)
	_hud_nitro_bar = ProgressBar.new()
	_hud_nitro_bar.max_value = 100.0
	_hud_nitro_bar.show_percentage = false
	_hud_nitro_bar.custom_minimum_size = Vector2(196, 10)
	var bar_bg := StyleBoxFlat.new()
	bar_bg.bg_color = Color(0.08, 0.12, 0.2, 0.85)
	bar_bg.set_corner_radius_all(5)
	var is_horse := str(GameData.selected_bike.get("id", "")) == "cheval"
	var bar_fill := StyleBoxFlat.new()
	bar_fill.bg_color = Color(0.24, 0.85, 0.42) if is_horse else Color(0.12, 0.88, 1.0)
	bar_fill.set_corner_radius_all(5)
	_hud_nitro_bar.add_theme_stylebox_override("background", bar_bg)
	_hud_nitro_bar.add_theme_stylebox_override("fill", bar_fill)
	right_col.add_child(_hud_nitro_bar)

	var action_row := HBoxContainer.new()
	action_row.add_theme_constant_override("separation", 10)
	var nitro_btn := _make_btn("GALOP" if is_horse else "NITRO", Color(0.06, 0.56, 0.82, 0.94), 52)
	nitro_btn.custom_minimum_size = Vector2(93, 52)
	nitro_btn.pressed.connect(func(): action_triggered.emit("NITRO", null))
	var wpn_btn := _make_btn("SAUTER" if is_horse else "TIRER", Color(0.9, 0.34, 0.12, 0.94), 52)
	wpn_btn.custom_minimum_size = Vector2(93, 52)
	wpn_btn.pressed.connect(func(): action_triggered.emit("WEAPON", null))
	action_row.add_child(nitro_btn)
	action_row.add_child(wpn_btn)
	right_col.add_child(action_row)
	bot.add_child(right_col)


func update_hud() -> void:
	if is_instance_valid(_hud_score):
		_hud_score.text = str(GameData.score)
	if is_instance_valid(_hud_combo):
		_hud_combo.text = "COMBO x%d" % GameData.combo
	if is_instance_valid(_hud_speed):
		_hud_speed.text = "%d KM/H" % int(round(GameData.speed * 3.6))
	if is_instance_valid(_hud_kills):
		_hud_kills.text = "VICTIMES: %d" % GameData.kills
	if is_instance_valid(_hud_progress):
		_hud_progress.value = clampf(GameData.distance / maxf(1.0, GameData.finish_distance) * 100.0, 0.0, 100.0)
	if is_instance_valid(_hud_nitro_bar):
		_hud_nitro_bar.value = GameData.nitro_charge


func show_floating_pts(pts: int) -> void:
	if not is_instance_valid(_hud_float_lbl):
		return
	_hud_float_lbl.text = "+%d" % pts
	_hud_float_lbl.modulate.a = 1.0
	_hud_float_lbl.scale = Vector2(1.25, 1.25)
	_hud_float_lbl.offset_top = -30.0
	var tw := create_tween().set_parallel(true)
	tw.tween_property(_hud_float_lbl, "modulate:a", 0.0, 0.65)
	tw.tween_property(_hud_float_lbl, "scale", Vector2.ONE, 0.25)
	tw.tween_property(_hud_float_lbl, "offset_top", -85.0, 0.65)


func _make_modal_overlay() -> Control:
	var bg := ColorRect.new()
	bg.set_anchors_preset(PRESET_FULL_RECT)
	bg.color = Color(0.0, 0.0, 0.0, 0.58)
	bg.mouse_filter = Control.MOUSE_FILTER_STOP
	_screen_root.add_child(bg)
	var cc := CenterContainer.new()
	cc.set_anchors_preset(PRESET_FULL_RECT)
	cc.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bg.add_child(cc)
	return cc


func show_pause_modal() -> void:
	var cc := _make_modal_overlay()
	var overlay := cc.get_parent()
	var modal := _make_panel(Color(0.05, 0.08, 0.14, 0.96))
	modal.custom_minimum_size = Vector2(360, 0)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 12)
	var t := Label.new()
	t.text = "PAUSE"
	t.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	t.add_theme_font_size_override("font_size", 26)
	v.add_child(t)

	var res := _make_btn("REPRENDRE", Color(0.08, 0.65, 0.42), 52)
	res.pressed.connect(func():
		overlay.queue_free()
		action_triggered.emit("RESUME", null)
	)
	var rst := _make_btn("RECOMMENCER", Color(0.85, 0.45, 0.12), 48)
	rst.pressed.connect(func():
		overlay.queue_free()
		action_triggered.emit("PLAY_CITY", GameData.challenge_mode)
	)
	var mp := _make_btn("RETOUR CARTE", Color(0.22, 0.28, 0.42), 48)
	mp.pressed.connect(func():
		overlay.queue_free()
		action_triggered.emit("TO_MAP", null)
	)
	v.add_child(res)
	v.add_child(rst)
	v.add_child(mp)
	modal.add_child(v)
	cc.add_child(modal)


func show_results_modal(summary: Dictionary) -> void:
	var cc := _make_modal_overlay()
	var overlay := cc.get_parent()
	var modal := _make_panel(Color(0.05, 0.08, 0.14, 0.96))
	modal.custom_minimum_size = Vector2(380, 0)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 12)
	var t := Label.new()
	t.text = "ÉTAPE TERMINÉE !"
	t.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	t.add_theme_font_size_override("font_size", 24)
	t.modulate = Color(1.0, 0.85, 0.2)
	var stats := Label.new()
	stats.text = "SCORE : %d\nÉTOILES : %d / 3\nVICTIMES : %d\nOR GAGNÉ : +%d" % [int(summary["score"]), int(summary["stars"]), int(summary["kills"]), int(summary["coins"])]
	stats.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	stats.add_theme_font_size_override("font_size", 18)
	v.add_child(t)
	v.add_child(stats)

	var replay := _make_btn("REJOUER", Color(0.1, 0.64, 0.44), 50)
	replay.pressed.connect(func():
		overlay.queue_free()
		action_triggered.emit("PLAY_CITY", GameData.challenge_mode)
	)
	var to_map := _make_btn("CARTE DU MONDE", Color(0.12, 0.45, 0.78), 50)
	to_map.pressed.connect(func():
		overlay.queue_free()
		action_triggered.emit("TO_MAP", null)
	)
	v.add_child(replay)
	v.add_child(to_map)
	modal.add_child(v)
	cc.add_child(modal)


func show_options_modal() -> void:
	var cc := _make_modal_overlay()
	var overlay := cc.get_parent()
	var modal := _make_panel(Color(0.05, 0.08, 0.14, 0.96))
	modal.custom_minimum_size = Vector2(380, 0)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 10)
	var t := Label.new()
	t.text = "OPTIONS"
	t.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	t.add_theme_font_size_override("font_size", 22)
	v.add_child(t)

	var s: Dictionary = GameData.save_data["settings"]
	var m_btn := _make_btn("MUSIQUE : %s" % ("ON" if s.get("music", true) else "OFF"), Color(0.15, 0.42, 0.75), 46)
	m_btn.pressed.connect(func():
		s["music"] = not bool(s.get("music", true))
		GameData.write_save()
		AudioMgr.sync_settings()
		m_btn.text = "MUSIQUE : %s" % ("ON" if s["music"] else "OFF")
	)
	var fx_btn := _make_btn("EFFETS : %s" % ("ON" if s.get("sfx", true) else "OFF"), Color(0.08, 0.56, 0.62), 46)
	fx_btn.pressed.connect(func():
		s["sfx"] = not bool(s.get("sfx", true))
		GameData.write_save()
		AudioMgr.sync_settings()
		fx_btn.text = "EFFETS : %s" % ("ON" if s["sfx"] else "OFF")
	)
	var ctrl_btn := _make_btn("CONTRÔLES : %s" % ("BOUTONS" if s.get("control_mode", "swipe") == "buttons" else "GLISSER"), Color(0.45, 0.3, 0.72), 46)
	ctrl_btn.pressed.connect(func():
		s["control_mode"] = "swipe" if s.get("control_mode", "swipe") == "buttons" else "buttons"
		GameData.write_save()
		ctrl_btn.text = "CONTRÔLES : %s" % ("BOUTONS" if s["control_mode"] == "buttons" else "GLISSER")
	)
	var close := _make_btn("FERMER", Color(0.24, 0.28, 0.36), 46)
	close.pressed.connect(func(): overlay.queue_free())
	v.add_child(m_btn)
	v.add_child(fx_btn)
	v.add_child(ctrl_btn)
	v.add_child(close)
	modal.add_child(v)
	cc.add_child(modal)
