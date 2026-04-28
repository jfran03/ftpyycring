let cached;

export function loadWebringData() {
  if (!cached) {
    cached = fetch("/data/members.json").then((res) => {
      if (!res.ok) throw new Error(`Failed to load members.json: ${res.status}`);
      return res.json();
    });
  }
  return cached;
}
