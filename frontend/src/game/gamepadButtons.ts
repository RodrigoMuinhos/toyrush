// Mapeamento do controle do gabinete: A/X nos índices 1/3; B/Y nos índices 0/2.
export const isConfirmPressed = (pad: Pick<Gamepad, "buttons">) =>
  !!pad.buttons[1]?.pressed || !!pad.buttons[3]?.pressed;
export const isBackPressed = (pad: Pick<Gamepad, "buttons">) =>
  !!pad.buttons[0]?.pressed || !!pad.buttons[2]?.pressed;
export const isFastDropPressed = (pad: Pick<Gamepad, "buttons">) =>
  [4, 5, 6, 7].some(index => !!pad.buttons[index]?.pressed) ||
  [6, 7].some(index => (pad.buttons[index]?.value ?? 0) > 0.45);
