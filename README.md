# PØLÆRIS

The PØLÆRIS robotics site pairs a scroll-controlled short film with the team roster, NRL story, and sponsorship information. Open index.html directly or serve the directory with a static HTTP server. There are no dependencies or build steps.

The opening uses the original 3840 × 2160 Mokka-tree.jpg from the Garuda Linux wallpaper repository. The original file remains unmodified. Runtime effects add a subtle camera pitch, falling leaves, and dusk grading. See assets/Garuda-LICENSE.txt for the upstream license and the source at https://gitlab.com/garuda-linux/themes-and-settings/artwork/garuda-wallpapers/-/blob/master/src/garuda-wallpapers/Mokka-tree.jpg.

The 1536 × 1024 monitor plate was generated with ImageGen and the 640 × 640 compass was supplied by the team. Canvas pixel density adapts up to 3× within a 12-megapixel budget. The OS reduced-motion preference switches the film to discrete still frames. The keyboard skip link goes directly to the roster.

Vercel serves the GitHub main branch using the Other preset and repository root.
