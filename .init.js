mp.module_paths.push("~~/scripts/modules.js");

mp.register_idle(function() {
  setTimeout(function() {mp.command("overlay-remove 0")}, 100);
})
