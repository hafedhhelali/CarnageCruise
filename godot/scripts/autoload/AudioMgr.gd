extends Node

const TRACK_PATHS := {
	"MENU": "res://assets/music/menu.mp3",
	"GAMEPLAY": "res://assets/music/gameplay.mp3",
	"PURSUIT": "res://assets/music/pursuit.mp3",
	"CATACLYSM": "res://assets/music/cataclysm.mp3"
}

const SFX_PATHS := {
	"click": ["res://assets/audio/interface/click_001.ogg", "res://assets/audio/interface/click_002.ogg"],
	"confirm": ["res://assets/audio/interface/confirmation_001.ogg", "res://assets/audio/interface/confirmation_002.ogg"],
	"crash": ["res://assets/audio/impact/impactMetal_heavy_000.ogg", "res://assets/audio/impact/impactMetal_heavy_001.ogg", "res://assets/audio/impact/impactMetal_heavy_002.ogg"],
	"smash": ["res://assets/audio/impact/impactGlass_heavy_000.ogg", "res://assets/audio/impact/impactGlass_heavy_001.ogg"],
	"explosion": ["res://assets/audio/scifi/explosionCrunch_000.ogg", "res://assets/audio/scifi/explosionCrunch_001.ogg", "res://assets/audio/scifi/lowFrequency_explosion_000.ogg"],
	"coin": ["res://assets/audio/casino/chips-stack-1.ogg", "res://assets/audio/casino/chips-stack-2.ogg"],
	"thruster": ["res://assets/audio/scifi/thrusterFire_000.ogg"],
	"victory": ["res://assets/audio/interface/confirmation_003.ogg"]
}

var _music_player: AudioStreamPlayer
var _engine_player: AudioStreamPlayer
var _sfx_pool: Array[AudioStreamPlayer] = []
var _sfx_idx := 0
var _sfx_cache: Dictionary = {}
var _current_track := ""
var _music_muted := false
var _sfx_muted := false


func _ready() -> void:
	_setup_buses()
	_music_player = AudioStreamPlayer.new()
	_music_player.bus = "Music"
	add_child(_music_player)

	_engine_player = AudioStreamPlayer.new()
	_engine_player.bus = "SFX"
	_engine_player.volume_db = -14.0
	add_child(_engine_player)

	for i in range(10):
		var p := AudioStreamPlayer.new()
		p.bus = "SFX"
		add_child(p)
		_sfx_pool.append(p)

	sync_settings()


func _setup_buses() -> void:
	if AudioServer.get_bus_index("Music") == -1:
		var idx := AudioServer.bus_count
		AudioServer.add_bus(idx)
		AudioServer.set_bus_name(idx, "Music")
		AudioServer.set_bus_volume_db(idx, -6.0)
	if AudioServer.get_bus_index("SFX") == -1:
		var idx2 := AudioServer.bus_count
		AudioServer.add_bus(idx2)
		AudioServer.set_bus_name(idx2, "SFX")
		AudioServer.set_bus_volume_db(idx2, -2.0)


func sync_settings() -> void:
	var s: Dictionary = GameData.save_data.get("settings", {})
	_music_muted = not bool(s.get("music", true))
	_sfx_muted = not bool(s.get("sfx", true))
	var m_idx := AudioServer.get_bus_index("Music")
	if m_idx != -1:
		AudioServer.set_bus_mute(m_idx, _music_muted)
	var s_idx := AudioServer.get_bus_index("SFX")
	if s_idx != -1:
		AudioServer.set_bus_mute(s_idx, _sfx_muted)


func play_music(track_name: String) -> void:
	if track_name == _current_track and _music_player.playing:
		return
	var path: String = TRACK_PATHS.get(track_name, TRACK_PATHS["GAMEPLAY"])
	if not ResourceLoader.exists(path):
		return
	var stream := load(path)
	if stream is AudioStreamMP3:
		stream.loop = true
	_current_track = track_name
	_music_player.stream = stream
	_music_player.play()


func stop_music() -> void:
	_music_player.stop()
	_current_track = ""


func play_sfx(key: String, pitch_min: float = 0.92, pitch_max: float = 1.08, volume_db: float = 0.0) -> void:
	if _sfx_muted:
		return
	var paths: Array = SFX_PATHS.get(key, [])
	if paths.is_empty():
		return
	var path: String = paths[randi() % paths.size()]
	if not _sfx_cache.has(path) and ResourceLoader.exists(path):
		_sfx_cache[path] = load(path)
	var stream: AudioStream = _sfx_cache.get(path)
	if stream == null:
		return
	var p := _sfx_pool[_sfx_idx]
	_sfx_idx = (_sfx_idx + 1) % _sfx_pool.size()
	p.stream = stream
	p.pitch_scale = randf_range(pitch_min, pitch_max)
	p.volume_db = volume_db
	p.play()


func update_engine(speed_ratio: float, active: bool) -> void:
	if not active or _sfx_muted:
		if _engine_player.playing:
			_engine_player.stop()
		return
	var thruster_path := "res://assets/audio/scifi/thrusterFire_000.ogg"
	if not _engine_player.playing and ResourceLoader.exists(thruster_path):
		var s := load(thruster_path)
		if s is AudioStreamOggVorbis:
			s.loop = true
		_engine_player.stream = s
		_engine_player.play()
	_engine_player.pitch_scale = clampf(0.62 + speed_ratio * 0.72, 0.55, 1.45)
	_engine_player.volume_db = lerpf(-22.0, -10.0, clampf(speed_ratio, 0.0, 1.0))
