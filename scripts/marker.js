/* jshint -W097 */
/* global mp, require */

/*
 * marker.js
 *
 * Version:     0.1.0
 * Author:      mochaaP
 * License:     MIT License
 */

'use strict';

var PathTools = require('PathTools'),
    SelectionMenu = require('SelectionMenu');

function isEmpty(array) {
  return !Array.isArray(array) || !array.length
}

function posToStamp(pos) {
  var formatTime = function(time) {
    var r = "" + time;
    while (r.length < 2) {
        r = "0" + r;
    }
    return r;
  }
  var time_seg = pos % 60;
  pos -= time_seg;
  var time_hours = Math.floor(pos / 3600);
  pos -= time_hours * 3600;
  var time_minutes = pos / 60;
  var time_ms = time_seg - Math.floor(time_seg);
  time_seg -= time_ms
  var time = formatTime(time_hours) + ":"
              + formatTime(time_minutes) + ":"
              + formatTime(time_seg) + "."
              + time_ms
              .toFixed(2).toString().split(".")[1];
  return time
}

var menu = new SelectionMenu();

function readBookmark() {
  marks = JSON.parse(mp.utils.read_file('~~/marker.json'))
  return marks
}

function writeBookmark(bookmarks) {
  function unescape(unicode) {
    var r = /\\u([\d\w]{4})/gi;
    return unicode.replace(r, function (match, grp) {
      return String.fromCharCode(parseInt(grp, 16));
    });
  }
  mp.utils.write_file('file://~~/marker.json', unescape(JSON.stringify(bookmarks)));
}

if (PathTools.getPathInfo(mp.utils.get_user_path('~~/marker.json')) !== 'file') {
  writeBookmark([])
}

var marks = readBookmark()

function showMenu() {
  function loadFile(file, pos) {
    var path = mp.get_property('path')
    if (PathTools.isWebURL(file) || PathTools.getPathInfo(file) === 'file') {
      if (file === path) {
        mp.set_property_number('time-pos', pos)
      } else {
        mp.commandv('loadfile', file, 'replace', 'start=' + pos);
      }
    }
  }

  function mainMenu() {
    readBookmark()
    menu.setTitle('Bookmarks' + (isEmpty(marks) ? ' (Empty)' : ''));
    menu.setOptions(marks.map(function(x) {
      var lastPos = x.position[x.position.length - 1]
      return x.name + ' @ ' + posToStamp(lastPos)
    }));
    menu.setCallbackMenuOpen(function() {
      var mark = marks[menu.selectionIdx]
      menu.hideMenu();
      menu.showMessage('Jumping: ' + mark.name);
      loadFile(mark.path, mark.position[mark.position.length - 1]);
    })
    menu.setCallbackMenuUndo(function() {
      marks.splice(menu.selectionIdx, 1);
      writeBookmark(marks);
      mainMenu();
    })

    menu.setCallbackMenuLeft(menu.hideMenu);
    menu.setCallbackMenuRight(function() {
      jumpMenu(marks[menu.selectionIdx], menu.selectionIdx)
    })
    menu.renderMenu();
  }
  
  function jumpMenu(mark, id) {
    menu.setTitle('Jump To @ ' + mark.name);
    menu.setOptions(mark.position.map(posToStamp));
    menu.setCallbackMenuOpen(function() {
      var pos = mark.position[menu.selectionIdx]
      menu.hideMenu();
      menu.showMessage('Jumping: ' + mark.name + ' @ ' + posToStamp(pos));
      loadFile(mark.path, pos);
    })
    menu.setCallbackMenuLeft(mainMenu);
    menu.setCallbackMenuRight();
    menu.setCallbackMenuUndo(function() {
      if (mark.position.length > 1) {
        mark.position.splice(menu.selectionIdx, 1);
        writeBookmark(marks);
        jumpMenu(marks[id], id);
      } else {
        marks.splice(id, 1)
        writeBookmark(marks);
        mainMenu();
      }
    })
    menu.renderMenu();
  }

  mainMenu();
}

function findMark() {
  var path = mp.get_property('path');
  var currentMark = marks.filter(function(x) { // find the mark
    return x.path === path
  })
  return isEmpty(currentMark) ? {
    path: path,
    position: [],
    name: mp.get_property('media-title') || mp.get_property('filename')
  } : currentMark[0]
}

function saveBookmark() {
  readBookmark();
  var path = mp.get_property('path');
  if (path) {
    var mark = findMark();
    var pos = mp.get_property_number('time-pos')
    var empty = isEmpty(mark.position);
    mark.position.push(pos);

    if (empty) {
      marks.push(mark);
      writeBookmark(marks);
      mp.osd_message('Bookmark created at ' + mark.name + ' @ ' + posToStamp(pos) + '[Slot ' + mark.position.length + ']')
    } else {
      writeBookmark(marks);
      mp.osd_message('Bookmark added at ' + mark.name + ' @ ' + posToStamp(pos) + '[Slot ' + mark.position.length + ']')
    }
    menu.hideMenu()
  } else {
    mp.osd_message('No playing detected, aborting')
  }
}

function loadBookmark() {
  var path = mp.get_property('path');
  if (path) {
    var mark = findMark();
    if (mark.position.length < 1) {
      mp.osd_message('No bookmarks found!');
    } else {
      var pos = mark.position[mark.position.length - 1]
      mp.osd_message('Jumping: ' + mark.name + ' @ ' + posToStamp(pos));
      loadFile(mark.path, pos);
      menu.hideMenu()
    }
  } else {
    mp.osd_message('No playing detected, aborting')
  }
}

mp.add_key_binding(null, 'marker-show', showMenu);
mp.add_key_binding(null, 'marker-save', saveBookmark);
mp.add_key_binding(null, 'marker-load', loadBookmark);
