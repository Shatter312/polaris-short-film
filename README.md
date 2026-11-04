# PØLÆRIS

The PØLÆRIS robotics site pairs a scroll-controlled short film with the team roster, NRL story, and sponsorship information. Open index.html directly or serve the directory with a static HTTP server. There are no dependencies or build steps.

The native 3840 × 2160 opening is Mokka-tree.jpg from the Garuda Linux wallpaper repository. The original file remains unmodified. The 1920 × 1080 compact version is a downsample and the 5760 × 3240 large version is a bicubic upscale. See assets/Garuda-LICENSE.txt for the upstream license and https://gitlab.com/garuda-linux/themes-and-settings/artwork/garuda-wallpapers/-/blob/master/src/garuda-wallpapers/Mokka-tree.jpg for the source.

The 1536 × 1024 ImageGen monitor plate and supplied 640 × 640 compass have 3072 × 2048 and 1280 × 1280 bicubic variants. A 1152 × 768 monitor downsample is served on compact displays. These preserve the same framing and artwork and add no native detail. The site selects image variants by pixel density and caps the animation canvas at 12 megapixels. The reduced-motion preference shows discrete film stills and skips the flash and optical passage. The keyboard skip link goes directly to the roster.

Vercel serves the GitHub main branch using the Other preset and repository root.
