class_name MapCanvas
extends Control

signal city_selected(city_id: String)
signal city_play_requested(city_id: String)

var cities_to_draw: Array = []
var selected_city_id: String = "paris"

var _zoom: float = 1.05
var _target_zoom: float = 1.15
var _pan: Vector2 = Vector2.ZERO
var _target_pan: Vector2 = Vector2.ZERO

var _cursor_pos: Vector2 = Vector2(0.417, 0.551)
var _cursor_from: Vector2 = Vector2(0.417, 0.551)
var _cursor_to: Vector2 = Vector2(0.417, 0.551)
var _travel_t: float = 1.0
var _pulse_t: float = 0.0

var _touches: Dictionary = {}
var _prev_pinch_dist: float = 0.0
var _dragging: bool = false
var _drag_moved: float = 0.0
var _last_click_id: String = ""
var _last_click_time: float = 0.0
var _geo_countries: Array = []
var _map_tex: Texture2D = null


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_STOP
	clip_contents = true
	set_process(true)
	if ResourceLoader.exists("res://assets/map/real_map.jpg"):
		_map_tex = load("res://assets/map/real_map.jpg")
	else:
		_load_geo()


func _load_geo() -> void:
	if not FileAccess.file_exists("res://data/map_geo.json"):
		return
	var parsed = JSON.parse_string(FileAccess.get_file_as_string("res://data/map_geo.json"))
	if typeof(parsed) == TYPE_ARRAY:
		_geo_countries = parsed


func set_data(filtered_cities: Array, sel_id: String, animate_to: bool = true) -> void:
	cities_to_draw = filtered_cities
	var prev_id := selected_city_id
	selected_city_id = sel_id
	var sel_norm := _get_norm_by_id(sel_id)
	if animate_to and prev_id != sel_id:
		_cursor_from = _cursor_pos
		_cursor_to = sel_norm
		_travel_t = 0.0
	else:
		_cursor_pos = sel_norm
		_cursor_from = sel_norm
		_cursor_to = sel_norm
		_travel_t = 1.0
	if size.x > 10.0 and size.y > 10.0:
		_focus_on_norm(sel_norm, _target_zoom)
	queue_redraw()


func zoom_by(factor: float) -> void:
	_target_zoom = clampf(_target_zoom * factor, 1.0, 5.5)
	_clamp_target_pan()


func _get_norm_by_id(cid: String) -> Vector2:
	for c in cities_to_draw:
		if str(c.get("id", "")) == cid and c.has("mapCoords"):
			return _norm(c["mapCoords"])
	for c in GameData.cities:
		if str(c.get("id", "")) == cid and c.has("mapCoords"):
			return _norm(c["mapCoords"])
	return Vector2(0.42, 0.55)


func _norm(mc: Dictionary) -> Vector2:
	return Vector2(clampf(float(mc.get("x", 50.0)) / 100.0, 0.03, 0.97), clampf(float(mc.get("y", 50.0)) / 100.0, 0.04, 0.96))


func _focus_on_norm(n: Vector2, z: float) -> void:
	var base := Vector2(n.x * size.x, n.y * size.y)
	_target_pan = size * 0.5 - base * z
	_clamp_target_pan()


func _clamp_target_pan() -> void:
	var max_x := 0.0
	var min_x := size.x * (1.0 - _target_zoom)
	var max_y := 0.0
	var min_y := size.y * (1.0 - _target_zoom)
	_target_pan.x = clampf(_target_pan.x, min_x, max_x)
	_target_pan.y = clampf(_target_pan.y, min_y, max_y)


func _world_to_screen(norm_pt: Vector2) -> Vector2:
	return Vector2(norm_pt.x * size.x, norm_pt.y * size.y) * _zoom + _pan


func _screen_to_norm(scr: Vector2) -> Vector2:
	if size.x < 1.0 or size.y < 1.0 or _zoom < 0.01:
		return Vector2(0.5, 0.5)
	var base := (scr - _pan) / _zoom
	return Vector2(base.x / size.x, base.y / size.y)


func _process(delta: float) -> void:
	var dt := minf(delta, 0.05)
	_pulse_t += dt * 4.0
	var need_redraw := false

	if absf(_zoom - _target_zoom) > 0.001 or _pan.distance_to(_target_pan) > 0.2:
		var old_center := _screen_to_norm(size * 0.5)
		_zoom = lerpf(_zoom, _target_zoom, clampf(dt * 14.0, 0.0, 1.0))
		_pan = _pan.lerp(_target_pan, clampf(dt * 14.0, 0.0, 1.0))
		if _pan.distance_to(_target_pan) < 0.25 and absf(_zoom - _target_zoom) < 0.002:
			_zoom = _target_zoom
			_pan = _target_pan
		need_redraw = true

	if _travel_t < 1.0:
		_travel_t = minf(1.0, _travel_t + dt * 2.2)
		var ease_t := 1.0 - pow(1.0 - _travel_t, 3.0)
		_cursor_pos = _cursor_from.lerp(_cursor_to, ease_t)
		need_redraw = true

	if need_redraw or true:
		queue_redraw()


func _poly_screen(pts_norm: Array) -> PackedVector2Array:
	var out := PackedVector2Array()
	for p in pts_norm:
		out.append(_world_to_screen(Vector2(p[0], p[1])))
	return out


func _draw() -> void:
	var w := size.x
	var h := size.y
	if w < 10.0 or h < 10.0:
		return

	# Deep ocean backdrop
	draw_rect(Rect2(0, 0, w, h), Color(0.04, 0.10, 0.20, 1.0), true)

	# Lat/Lng grid
	var grid_col := Color(0.16, 0.34, 0.54, 0.25)
	for i in range(1, 10):
		var p0 := _world_to_screen(Vector2(float(i) * 0.1, 0.0))
		var p1 := _world_to_screen(Vector2(float(i) * 0.1, 1.0))
		draw_line(p0, p1, grid_col, 1.0)
	for j in range(1, 10):
		var q0 := _world_to_screen(Vector2(0.0, float(j) * 0.1))
		var q1 := _world_to_screen(Vector2(1.0, float(j) * 0.1))
		draw_line(q0, q1, grid_col, 1.0)

	# Real National Geographic projected map texture (with vector fallback)
	if _map_tex != null:
		draw_texture_rect(_map_tex, Rect2(_pan, size * _zoom), false)
	else:
		var land_col := Color(0.16, 0.32, 0.25, 0.96)
		var land_border := Color(0.36, 0.72, 0.60, 0.72)
		for country in _geo_countries:
			for ring in country.get("polys", []):
				var pts_arr := PackedVector2Array()
				for pt in ring:
					pts_arr.append(_world_to_screen(Vector2(float(pt[0]) / 100.0, float(pt[1]) / 100.0)))
				if pts_arr.size() >= 3:
					if Geometry2D.triangulate_polygon(pts_arr).size() >= 3:
						draw_colored_polygon(pts_arr, land_col)
					var closed := PackedVector2Array(pts_arr)
					closed.append(pts_arr[0])
					draw_polyline(closed, land_border, 1.2, true)

	# Tour route polyline
	var route_pts := PackedVector2Array()
	for c in cities_to_draw:
		if c.has("mapCoords"):
			route_pts.append(_world_to_screen(_norm(c["mapCoords"])))
	if route_pts.size() >= 2:
		draw_polyline(route_pts, Color(1.0, 0.78, 0.22, 0.48), clampf(1.8 * sqrt(_zoom), 1.5, 4.0), true)

	# Travel trail during animation
	if _travel_t < 1.0:
		draw_line(_world_to_screen(_cursor_from), _world_to_screen(_cursor_pos), Color(0.25, 0.95, 1.0, 0.85), 3.0, true)

	# City pins
	var font := ThemeDB.fallback_font
	for c in cities_to_draw:
		if not c.has("mapCoords"):
			continue
		var cid := str(c.get("id", ""))
		var p := _world_to_screen(_norm(c["mapCoords"]))
		if p.x < -30 or p.x > w + 30 or p.y < -30 or p.y > h + 30:
			continue
		var is_sel := (cid == selected_city_id)
		var stars := int(GameData.save_data["city_stars"].get(cid, 0))
		if is_sel:
			var pulse := 11.0 + sin(_pulse_t) * 3.0
			draw_circle(p, pulse, Color(1.0, 0.85, 0.2, 0.35))
			draw_circle(p, 6.5, Color(1.0, 0.88, 0.22))
			draw_string(font, p + Vector2(10, 4), str(c.get("name", "")).to_upper(), HORIZONTAL_ALIGNMENT_LEFT, -1, 14, Color(1.0, 0.96, 0.5))
		else:
			var col := Color(0.25, 0.92, 0.55) if stars > 0 else Color(0.32, 0.78, 1.0)
			draw_circle(p, clampf(3.8 * sqrt(_zoom), 3.5, 6.5), col)
			if _zoom >= 1.85:
				draw_string(font, p + Vector2(7, 3), str(c.get("name", "")), HORIZONTAL_ALIGNMENT_LEFT, -1, 11, Color(0.85, 0.92, 1.0, 0.88))

	# Animated travel marker
	var cur_px := _world_to_screen(_cursor_pos)
	draw_circle(cur_px, 4.5, Color(1.0, 0.35, 0.2))
	draw_rect(Rect2(0, 0, w, h), Color(0.2, 0.78, 0.92, 0.65), false, 2.0)


func _gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_WHEEL_UP and event.pressed:
			_apply_zoom_at(1.18, event.position)
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN and event.pressed:
			_apply_zoom_at(1.0 / 1.18, event.position)
		elif event.button_index == MOUSE_BUTTON_LEFT:
			if event.pressed:
				_dragging = true
				_drag_moved = 0.0
			else:
				if _dragging and _drag_moved < 12.0:
					_handle_tap(event.position)
				_dragging = false
	elif event is InputEventMouseMotion and _dragging:
		_drag_moved += event.relative.length()
		_target_pan += event.relative
		_clamp_target_pan()
		_pan = _target_pan
	elif event is InputEventScreenTouch:
		if event.pressed:
			_touches[event.index] = event.position
			if _touches.size() == 1:
				_drag_moved = 0.0
			elif _touches.size() == 2:
				var vals := _touches.values()
				var p0: Vector2 = vals[0]
				var p1: Vector2 = vals[1]
				_prev_pinch_dist = p0.distance_to(p1)
		else:
			if _touches.size() == 1 and _drag_moved < 14.0:
				_handle_tap(event.position)
			_touches.erase(event.index)
			_prev_pinch_dist = 0.0
	elif event is InputEventScreenDrag:
		_touches[event.index] = event.position
		if _touches.size() == 1:
			_drag_moved += event.relative.length()
			_target_pan += event.relative
			_clamp_target_pan()
			_pan = _target_pan
		elif _touches.size() == 2:
			var vals := _touches.values()
			var p0: Vector2 = vals[0]
			var p1: Vector2 = vals[1]
			var dist: float = p0.distance_to(p1)
			var mid: Vector2 = (p0 + p1) * 0.5
			if _prev_pinch_dist > 10.0:
				_apply_zoom_at(dist / _prev_pinch_dist, mid)
			_prev_pinch_dist = dist


func _apply_zoom_at(factor: float, pivot_scr: Vector2) -> void:
	var old_zoom := _target_zoom
	_target_zoom = clampf(_target_zoom * factor, 1.0, 5.5)
	var ratio := _target_zoom / maxf(old_zoom, 0.01)
	_target_pan = pivot_scr - (pivot_scr - _target_pan) * ratio
	_clamp_target_pan()


func _handle_tap(pos: Vector2) -> void:
	var best_id := ""
	var best_dist := 28.0
	for c in cities_to_draw:
		if not c.has("mapCoords"):
			continue
		var d := _world_to_screen(_norm(c["mapCoords"])).distance_to(pos)
		if d < best_dist:
			best_dist = d
			best_id = str(c.get("id", ""))
	if best_id != "":
		AudioMgr.play_sfx("click")
		var now := Time.get_ticks_msec() / 1000.0
		if best_id == _last_click_id and (now - _last_click_time) < 0.45:
			city_play_requested.emit(best_id)
			return
		_last_click_id = best_id
		_last_click_time = now
		set_data(cities_to_draw, best_id, true)
		city_selected.emit(best_id)
