---
layout: home
title: About
permalink: /about/
---

# About MeRIT

MeRIT, the Mensural Rhythm Interpretation Tool, is a client-side Javascript tool that interprets the rhythmic notation of pre-modern polyphonic music using rules derived from the writings of the fifteenth-century music theorist and composer Johannes Tinctoris (c.1435–1511).

In the Interpreter window, users may load a mensural MEI file from their local computer or from a URL, and then select ‘Run’ in the top menu bar to begin analysis. In order to inspect the interpreter’s analysis, users should click on a note within the rendered music in order to display this information in a side-window to the left of the music notation. Note-to-note navigation within bar lines may be carried out using the ← and → keys.

Modified notes will be highlighted by a color code in interpreter mode:

* <span class="perfecta">Perfecta (red)</span>
* <span class="imperfecta">Imperfecta (green)</span>
* <span class="altera">Altera (orange)</span>
* <span class="simpleDot">Dot of augmentation (purple)</span>
* <span class="non-standard">Partial or non-standard imperfection (blue)</span>

If necessary, users may wish to adjust the interpreter’s results. This may be achieved in the left window, under ‘Interpreter Modification’, by adding or changing quality or ‘num/numbase’, ‘rule’, and ‘duration in minims’. The quality of a note is added only in cases of ambiguity (following the current mensuration). Please do not use, for example, “perfecta” for already-perfect notes. To remove an erroneously set quality, choose “none”. While quality is used for standard imperfection and alteration, num/numbase is used for cases of partial imperfection. For example, should a user wish to change the absolute duration of a longa from six semibreves to five semibreves, num should be changed to ‘6’, and numbase to ‘5’. Users may save their feedback by adding their name and initials before selecting ‘Save’ in the (otherwise it breaks). The mensurally coherent blocks detected may be inspected in the ‘Blocks’ window.

A line-by-line explanation of the logical procedures carried out by MeRIT is available in the ‘Rules’ section.

The interpretation produced by MeRIT is written in standards-compliant MEI, including details of the rules being applied at each point and a fine-grained metrical analysis. This interpreted MEI may be downloaded using the ‘MEI’ button in the top menu bar.

MeRIT is an output of _Interpreting the Mensural Notation of Music_ (2017–2022), an AHRC-funded research project hosted at the Royal Birmingham Conservatoire. For more information about the project and its team, funding, and outputs, please see the ‘about’ menu at the top of this page.
