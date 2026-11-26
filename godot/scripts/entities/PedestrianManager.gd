class_name PedestrianManager
extends Node3D

var peds: Array[Dictionary] = []
var _glb_cache: Dictionary = {}
var _anim_clips: Array[Animation] = []
const PED_KEYS := ["q_casual_man", "q_casual_woman", "q_swat", "q_cyber_char"]


func _ready() -> void:
	_load_shared_clips()
	for i in range(18):
		var key: String = PED_KEYS[i % PED_KEYS.size()]
		var node := _spawn_ped_node(key)
		node.visible = false
		add_child(node)
		var ap: AnimationPlayer = node.get_meta("anim_player", null)
		peds.append({
			"node": node,
			"anim": ap,
			"active": false,
			"flying": false,
			"fleeing": false,
			"side": 1 if (i % 2 == 0) else -1,
			"walk_dir": 1.0 if (i % 3 == 0) else -1.0,
			"vx": 0.0,
			"vy": 0.0,
			"vz": 0.0
		})


func _load_shared_clips() -> void:
	var anim_path := "res://assets/models/q_cyber_char.glb"
	if ResourceLoader.exists(anim_path):
		var ps: PackedScene = load(anim_path)
		if ps:
			var tmp := ps.instantiate()
			var ap := _find_ap(tmp)
			if ap:
				for name in ap.get_animation_list():
					if name.ends_with("Walk") or name.ends_with("Run"):
						var clip: Animation = ap.get_animation(name).duplicate()
						# Remove position/scale tracks so cross-skeleton retargeting never stretches limbs!
						for ti in range(clip.get_track_count() - 1, -1, -1):
							var ttype := clip.track_get_type(ti)
							if ttype == Animation.TYPE_POSITION_3D or ttype == Animation.TYPE_SCALE_3D:
								clip.remove_track(ti)
						clip.resource_name = "Run" if name.ends_with("Run") else "Walk"
						clip.loop_mode = Animation.LOOP_LINEAR
						_anim_clips.append(clip)
			tmp.queue_free()


func _find_ap(n: Node) -> AnimationPlayer:
	if n is AnimationPlayer:
		return n
	for c in n.get_children():
		var f := _find_ap(c)
		if f:
			return f
	return null


func _spawn_ped_node(key: String) -> Node3D:
	var path := "res://assets/models/%s.glb" % key
	if ResourceLoader.exists(path):
		if not _glb_cache.has(key):
			_glb_cache[key] = load(path)
		var ps: PackedScene = _glb_cache[key]
		if ps:
			var inst := ps.instantiate() as Node3D
			if inst:
				inst.scale = Vector3.ONE * randf_range(0.84, 1.02)
				var ap := _find_ap(inst)
				if ap == null and _anim_clips.size() > 0:
					ap = AnimationPlayer.new()
					inst.add_child(ap)
				if ap and _anim_clips.size() > 0:
					var lib := AnimationLibrary.new()
					for clip in _anim_clips:
						var short_name := "Run" if "Run" in clip.resource_name else "Walk"
						if not lib.has_animation(short_name):
							lib.add_animation(short_name, clip)
					if not ap.has_animation_library(""):
						ap.add_animation_library("", lib)
					if ap.has_animation("Walk"):
						ap.play("Walk")
				inst.set_meta("anim_player", ap)
				return inst
	var m := MeshInstance3D.new()
	var c := CapsuleMesh.new()
	c.radius = 0.25
	c.height = 1.6
	m.mesh = c
	return m


func reset_peds() -> void:
	for p in peds:
		p["active"] = false
		p["flying"] = false
		p["fleeing"] = false
		p["node"].visible = false


func update_peds(delta: float, player_pos: Vector3, player_speed: float, road_straight: bool, on_hit: Callable) -> void:
	for i in range(peds.size()):
		var p := peds[i]
		var n: Node3D = p["node"]
		var ap: AnimationPlayer = p.get("anim")
		if p["flying"]:
			n.position += Vector3(p["vx"], p["vy"], p["vz"]) * delta
			p["vy"] = float(p["vy"]) - 16.0 * delta
			n.rotation.x += 10.0 * delta
			n.rotation.y += 12.0 * delta
			if n.position.y < -3.0:
				p["flying"] = false
				p["active"] = false
				n.visible = false
			continue

		if not p["active"] or n.position.z < player_pos.z - 15.0:
			var sz := player_pos.z + 42.0 + float(i) * 7.5 + randf_range(0.0, 5.0)
			var side := 1 if (i % 2 == 0) else -1
			p["side"] = side
			p["active"] = true
			p["flying"] = false
			p["fleeing"] = false
			n.visible = true
			n.rotation = Vector3.ZERO
			var offset_x := float(side) * randf_range(4.8, 6.2)
			n.position = Vector3(RoadCurve.get_road_center_x(sz, road_straight) + offset_x, 0.25, sz)
			if ap and ap.has_animation("Walk"):
				ap.play("Walk")
				ap.speed_scale = 1.15
			continue

		var dz := n.position.z - player_pos.z
		var dx := absf(n.position.x - player_pos.x)
		var should_flee := player_speed > 3.5 and dz > 0.0 and dz < 26.0 and dx < 4.8
		if should_flee and not p["fleeing"]:
			p["fleeing"] = true
			if ap and ap.has_animation("Run"):
				ap.play("Run")
				ap.speed_scale = 1.35

		if p["fleeing"]:
			var sprint_speed := 6.2
			var rx := RoadCurve.get_road_center_x(n.position.z, road_straight)
			var away_x := 1.0 if n.position.x >= player_pos.x else -1.0
			var dx_from_center := n.position.x - rx
			if absf(dx_from_center) < 7.6:
				# Diagonal flee away from vehicle toward sidewalk safety
				var vx := away_x * sprint_speed * 0.85
				var vz := sprint_speed * 0.52
				n.position.x = clampf(n.position.x + vx * delta, rx - 7.7, rx + 7.7)
				n.position.z += vz * delta
				n.rotation.y = lerp_angle(n.rotation.y, atan2(vx, vz), clampf(delta * 12.0, 0.0, 1.0))
			else:
				# Safe along building edge: run forward along sidewalk smoothly
				n.position.z += sprint_speed * delta
				n.rotation.y = lerp_angle(n.rotation.y, 0.0, clampf(delta * 10.0, 0.0, 1.0))
		else:
			n.position.z += float(p["walk_dir"]) * 1.4 * delta
			n.rotation.y = 0.0 if float(p["walk_dir"]) > 0.0 else PI

		var hit_z := absf(n.position.z - player_pos.z)
		var hit_x := absf(n.position.x - player_pos.x)
		if hit_z < maxf(1.8, player_speed * delta + 0.8) and hit_x < 1.75 and player_pos.y < 1.8:
			p["flying"] = true
			p["vx"] = (1.0 if n.position.x >= player_pos.x else -1.0) * randf_range(4.5, 8.5)
			p["vy"] = randf_range(8.5, 12.5)
			p["vz"] = maxf(6.0, player_speed * 0.5)
			on_hit.call(n.position)
