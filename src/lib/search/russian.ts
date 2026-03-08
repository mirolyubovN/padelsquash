export function buildRussianYoVariants(input: string, maxTogglePositions = 5): string[] {
  const query = input.trim().toLocaleLowerCase("ru-RU");
  if (!query) {
    return [];
  }

  const chars = Array.from(query);
  const yoPositions = chars.reduce<number[]>((positions, char, index) => {
    if (char === "е" || char === "ё") {
      positions.push(index);
    }
    return positions;
  }, []);

  if (yoPositions.length === 0) {
    return [query];
  }

  const toggledPositions = yoPositions.slice(0, Math.max(0, maxTogglePositions));
  const variants = new Set<string>();
  const combinations = 1 << toggledPositions.length;

  for (let mask = 0; mask < combinations; mask += 1) {
    const next = [...chars];
    for (let i = 0; i < toggledPositions.length; i += 1) {
      next[toggledPositions[i]] = (mask & (1 << i)) !== 0 ? "ё" : "е";
    }
    variants.add(next.join(""));
  }

  return Array.from(variants);
}

