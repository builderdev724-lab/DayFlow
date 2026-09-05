# Dayflow 0.5.3 geometry fix

This pass removes the overlapping timeline implementation and uses one stable three-column geometry:

`time | timeline rail | task card`

Task artwork is now a normal grid column with a fixed thumbnail box, so it cannot overlap the content or stretch with the card height.

The same geometry is used in light and dark mode.
