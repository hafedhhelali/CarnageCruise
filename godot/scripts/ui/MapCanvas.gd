class_name MapCanvas
extends Control

signal city_clicked(city_id: String)

var cities_to_draw: Array = []
var selected_city_id: String = "paris"


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_STOP
	custom_minimum_size = Vector2(0, 310)


func set_data(filtered_cities: Array, sel_id: String) -> void:
	cities_to_draw = filtered_cities
	selected_city_id = sel_id
	queue_redraw()


func _to_px(mc: Dictionary) -> Vector2:
	var w := size.x
	var h := size.y
	var nx := clampf(float(mc.get("x", 50.0)) / 100.0, 0.04, 0.96)
	var ny := clampf(float(mc.get("y", 50.0)) / 100.0, 0.06, 0.94)
	return Vector2(nx * w, ny * h)


func _draw() -> void:
	var w := size.x
	var h := size.y
	if w < 10.0 or h < 10.0:
		return

	# Ocean background
	draw_rect(Rect2(0, 0, w, h), Color(0.05, 0.11, 0.21, 0.96), true)

	# Grid meridians & parallels
	var grid_col := Color(0.18, 0.36, 0.56, 0.28)
	for i in range(1, 6):
		var gx := w * float(i) / 6.0
		draw_line(Vector2(gx, 0), Vector2(gx, h), grid_col, 1.0)
	for j in range(1, 5):
		var gy := h * float(j) / 5.0
		draw_line(Vector2(0, gy), Vector2(w, gy), grid_col, 1.0)

	# Stylized landmasses (Europe, Maghreb, Levant)
	var land_col := Color(0.14, 0.27, 0.24, 0.9)
	var land_border := Color(0.28, 0.58, 0.52, 0.65)
	var europe_poly := PackedVector2Array([
		Vector2(0.14 * w, 0.72 * h), Vector2(0.16 * w, 0.52 * h), Vector2(0.26 * w, 0.34 * h),
		Vector2(0.36 * w, 0.12 * h), Vector2(0.56 * w, 0.10 * h), Vector2(0.74 * w, 0.26 * h),
		Vector2(0.76 * w, 0.60 * h), Vector2(0.62 * w, 0.68 * h), Vector2(0.46 * w, 0.66 * h),
		Vector2(0.32 * w, 0.72 * h)
	])
	var maghreb_poly := PackedVector2Array([
		Vector2(0.08 * w, 0.78 * h), Vector2(0.26 * w, 0.76 * h), Vector2(0.58 * w, 0.78 * h),
		Vector2(0.68 * w, 0.88 * h), Vector2(0.54 * w, 0.95 * h), Vector2(0.10 * w, 0.95 * h)
	])
	var levant_poly := PackedVector2Array([
		Vector2(0.72 * w, 0.62 * h), Vector2(0.95 * w, 0.58 * h), Vector2(0.96 * w, 0.92 * h),
		Vector2(0.72 * w, 0.90 * h)
	])
	for poly in [europe_poly, maghreb_poly, levant_poly]:
		draw_colored_polygon(poly, land_col)
		var closed := PackedVector2Array(poly)
		closed.append(poly[0])
		draw_polyline(closed, land_border, 1.5, true)

	# Tour route polyline
	var pts := PackedVector2Array()
	for c in cities_to_draw:
		if c.has("mapCoords"):
			pts.append(_to_px(c["mapCoords"]))
	if pts.size() >= 2:
		draw_polyline(pts, Color(1.0, 0.78, 0.22, 0.52), 2.0, true)

	# City pins
	var font := ThemeDB.fallback_font
	for c in cities_to_draw:
		if not c.has("mapCoords"):
			continue
		var cid := str(c.get("id", ""))
		var p := _to_px(c["mapCoords"])
		var is_sel := (cid == selected_city_id)
		var stars := int(GameData.save_data["city_stars"].get(cid, 0))
		if is_sel:
			draw_circle(p, 11.0, Color(1.0, 0.85, 0.2, 0.35))
			draw_circle(p, 6.0, Color(1.0, 0.88, 0.25))
			draw_string(font, p + Vector2(9, 4), str(c.get("name", "")).to_upper(), HORIZONTAL_ALIGNMENT_LEFT, -1, 13, Color(1.0, 0.94, 0.45))
		else:
			var col := Color(0.25, 0.92, 0.55) if stars > 0 else Color(0.32, 0.76, 1.0)
			draw_circle(p, 3.8, col)

	draw_rect(Rect2(0, 0, w, h), Color(0.2, 0.78, 0.92, 0.65), false, 2.0)


func _gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		var best_id := ""
		var best_dist := 24.0
		for c in cities_to_draw:
			if not c.has("mapCoords"):
				continue
			var d := _to_px(c["mapCoords"]).distance_to(event.position)
			if d < best_dist:
				best_dist = d
				best_id = str(c.get("id", ""))
		if best_id != "":
			AudioMgr.play_sfx("click")
			city_clicked.emit(best_id)
