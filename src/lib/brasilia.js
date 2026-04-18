export function agoraISO() {
  return new Date().toISOString();
}

export function hojeData() {
  return new Date().toISOString().split('T')[0];
}