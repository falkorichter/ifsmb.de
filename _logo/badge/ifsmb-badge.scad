// IfsMB badge for 3D printing with only ONE colour change
//
// Layers (bottom to top):
//   yellow – base plate in the outline of badge + shadow             (0 … base_h)
//   black  – border, wordmark and shadow stand raised on top of it   (base_h … base_h + relief_h)
// So the colour change is exactly at Z = base_h. A printer without a multi-colour system
// only needs one pause/filament change at that height.
//
// With name = "" this is exactly the logo "Logo (Badge) als SVG" (../institut/ifsmb-logo-badge.svg).
// With a name the shadow is extended into a black band at the bottom; the letters of the
// name are cut out of it, so the yellow base plate shows through.
//
// Export (see README.md, or export_colored.py for 3MF/OBJ/STL/preview at once):
//   openscad -o ifsmb-badge.stl                         ifsmb-badge.scad
//   openscad -D 'name="Falko"' -o ifsmb-badge-falko.stl ifsmb-badge.scad
//   openscad -D 'part="yellow"' -o …-gelb.stl    ifsmb-badge.scad   (AMS/MMU: two parts)
//   openscad -D 'part="black"'  -o …-schwarz.stl ifsmb-badge.scad

include <ifsmb-wordmark.scad>   // wordmark "IfsMB" as a polygon from the SVG (no font needed)

// Font only for the name: SF Mono Heavy like the logo (ships with macOS Terminal).
// On other systems set name_font to another bold font, e.g. "DejaVu Sans Mono:style=Bold".
use </System/Applications/Utilities/Terminal.app/Contents/Resources/Fonts/SF-Mono-Heavy.otf>

/* [General] */
part      = "all";    // ["all", "yellow", "black"] all = one body for a colour change by pause
width     = 50;       // badge width in mm (outer edge of the border, without shadow)
tilt      = -3;       // rotation like the logo (degrees, clockwise negative), 0 = straight

/* [Heights] */
base_h    = 1.4;      // yellow base plate (mm) = height of the colour change
relief_h  = 0.6;      // black parts stand this far above the yellow (mm)

/* [Name] */
name      = "";       // empty = logo only, otherwise e.g. "Falko"
name_band = 9;        // visible height of the black band below the badge (mm)
name_size = 6;        // desired font size (mm); long names get smaller automatically
name_font = "SF Mono:style=Heavy";
name_advance = 0.83;  // character width / font size of the monospace font (for auto-shrinking)

/* [Back] */
// recess for a pin to glue in, [0,0,0] = none
pin_slot  = [26, 4.2, 0.6];

$fn = 64;

// ---------------------------------------------------------------------------
// Geometry in SVG units (from ifsmb-logo-badge.svg), Y mirrored.
// ---------------------------------------------------------------------------
stroke   = 15;                       // border width in the SVG
badge    = [40, 45, 734.4, 275, 40]; // x, y, w, h, rx  (border centred on this edge)
shadow   = [66.5, 71.5, 749.4, 290, 47.5];

s        = width / (badge[2] + stroke);    // mm per SVG unit
outer_bottom = badge[1] + badge[3] + stroke / 2;

// extend the shadow downwards when there is a name
shadow_h = name == "" ? shadow[3]
                      : outer_bottom + name_band / s - shadow[1];

// SVG rectangle with rounded corners (x, y top left, Y down) -> OpenSCAD
module svg_rect(x, y, w, h, r)
  translate([x, -y - h]) offset(r) offset(-r) square([w, h]);

module outer2d()  offset(stroke / 2)  svg_rect(badge[0], badge[1], badge[2], badge[3], badge[4]);
module inner2d()  offset(-stroke / 2) svg_rect(badge[0], badge[1], badge[2], badge[3], badge[4]);
module shadow2d() svg_rect(shadow[0], shadow[1], shadow[2], shadow_h, shadow[4]);

// centre the name in the visible part of the band; shrink names that are too long
band_w    = shadow[2] - 2 * shadow[4];                   // usable width (SVG units)
band_top  = outer_bottom;
band_bot  = shadow[1] + shadow_h;
name_fit  = min(name_size / s, band_w / max(1, len(name) * name_advance));
module name2d()
  translate([shadow[0] + shadow[2] / 2, -(band_top + band_bot) / 2])
    text(name, size = name_fit, font = name_font, halign = "center", valign = "center");

module yellow2d() union() { outer2d(); shadow2d(); }

module black2d() {
  difference() { outer2d(); inner2d(); }               // border
  ifsmb_wordmark();                                    // IfsMB
  difference() {                                       // shadow (or name band)
    shadow2d();
    outer2d();
    if (name != "") name2d();
  }
}

// SVG units -> mm, badge centre at the origin (rotation happens around this point afterwards)
module flat() scale([s, s]) translate(-[badge[0] + badge[2] / 2, -(badge[1] + badge[3] / 2)]) children();

module yellow() {
  difference() {
    linear_extrude(base_h) rotate(tilt) flat() yellow2d();
    if (pin_slot[0] > 0)
      translate([0, 0, -0.01]) linear_extrude(pin_slot[2] + 0.01)
        square([pin_slot[0], pin_slot[1]], center = true);
  }
}
module black() translate([0, 0, base_h]) linear_extrude(relief_h) rotate(tilt) flat() black2d();

if (part == "yellow") color("#ffcc00") yellow();
if (part == "black")  color("#16161d") black();
if (part == "all")    { color("#ffcc00") yellow(); color("#16161d") black(); }
