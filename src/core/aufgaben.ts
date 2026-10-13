// Kleine Helfer rund um Aufgaben aus Apple Erinnerungen.

/** Aufgaben aus der Erinnerungen-Liste "Schule" gehören in den Bereich Schule (Hausaufgaben). */
export const istSchulListe = (liste?: string) => liste?.trim().toLowerCase() === 'schule'
