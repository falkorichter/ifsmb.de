// IfsMB-Pin – Logo-Badge „IfsMB“ als Anstecker für den 2-Farb-Druck
// Farbe 1 (gelb):    Fläche des Badges          -> part = "gelb"
// Farbe 2 (schwarz): Rückplatte mit Schatten, Rand und Schrift -> part = "schwarz"
// Beide STLs im Slicer als Teile EINES Objekts laden (gleicher Ursprung) und je eine Farbe zuweisen.
//
// Export:
//   openscad -D 'part="gelb"'    -o ifsmb-pin-gelb.stl    ifsmb-pin.scad
//   openscad -D 'part="schwarz"' -o ifsmb-pin-schwarz.stl ifsmb-pin.scad
//
// Schrift: wie das Logo auf ifsmb.de die Monospace-Systemschrift von macOS (SF Mono Heavy).
// Die Datei liegt im Terminal-Programm von macOS und wird hier nur zum Rendern geladen (nicht im Repo).
use </System/Applications/Utilities/Terminal.app/Contents/Resources/Fonts/SF-Mono-Heavy.otf>

part      = "beide";      // "gelb" | "schwarz" | "beide" (Vorschau)
label     = "IfsMB";
font      = "SF Mono:style=Heavy";

width     = 50;    // Breite des Badges (mm, ohne Schatten)
height    = 22;    // Höhe des Badges
radius    = 4;     // Eckenradius
border    = 1.4;   // schwarzer Rand
shadow    = [1.8, -1.8]; // Versatz des schwarzen Schattens (wie box-shadow 3px 3px)
text_w    = 38;    // Breite des Schriftzugs
tilt      = -3;    // Drehung wie im Header (Grad), 0 = gerade

base_h    = 1.2;   // schwarze Rückplatte
face_h    = 0.8;   // gelbe Fläche (bündig mit dem Rand)
text_h    = 0.6;   // Schrift steht über der gelben Fläche

// Aussparung für eine Anstecknadel zum Einkleben (Rückseite), 0 = keine
pin_slot  = [26, 4.2, 0.6];

$fn = 64;

module rounded(w, h, r) {
  offset(r) offset(-r) square([w, h], center = true);
}
module badge2d()  rounded(width, height, radius);
module inner2d()  offset(-border) badge2d();
module label2d()  resize([text_w, 0], auto = true)
                    text(label, font = font, halign = "center", valign = "center");

module black() {
  difference() {
    union() {
      // Rückplatte: Badge + Schatten
      linear_extrude(base_h) hull() { badge2d(); translate(shadow) badge2d(); }
      // Rand
      translate([0, 0, base_h]) linear_extrude(face_h)
        difference() { badge2d(); inner2d(); }
      // Schrift (durch die gelbe Fläche hindurch bis oben)
      translate([0, 0, base_h]) linear_extrude(face_h + text_h) label2d();
    }
    if (pin_slot[0] > 0)
      translate([0, 0, -0.01]) linear_extrude(pin_slot[2] + 0.01)
        square([pin_slot[0], pin_slot[1]], center = true);
  }
}
module yellow() {
  translate([0, 0, base_h]) linear_extrude(face_h)
    difference() { inner2d(); label2d(); }
}

rotate([0, 0, tilt]) {
  if (part == "schwarz" || part == "beide") color("#16161d") black();
  if (part == "gelb"    || part == "beide") color("#ffcc00") yellow();
}
