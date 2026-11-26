class_name RoadCurve
extends RefCounted

const INTERSECTION_FIRST_Z := 95.0
const INTERSECTION_SPACING := 160.0


static func get_road_center_x(z: float, road_straight: bool = false) -> float:
	if road_straight:
		return 0.0
	var ramp := clampf((z - 15.0) / 40.0, 0.0, 1.0)
	var u := (PI * (z - INTERSECTION_FIRST_Z)) / INTERSECTION_SPACING
	return ramp * ((cos(u) - 1.0) * 4.5)


static func get_road_angle(z: float, road_straight: bool = false) -> float:
	if road_straight:
		return 0.0
	var ramp := clampf((z - 15.0) / 40.0, 0.0, 1.0)
	var u := (PI * (z - INTERSECTION_FIRST_Z)) / INTERSECTION_SPACING
	var deriv := ramp * (-sin(u) * (4.5 * PI / INTERSECTION_SPACING))
	return atan(deriv)


static func get_sidewalk_lift(abs_x: float) -> float:
	if abs_x >= 6.05:
		return 0.25
	if abs_x <= 4.75:
		return 0.0
	return clampf((abs_x - 4.75) / 1.3, 0.0, 1.0) * 0.25
