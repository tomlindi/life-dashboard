// ZWISCHENABLAGE LESEN – auch wenn sie aus MEHREREN Einträgen besteht.
//
// Kopiert ein Kurzbefehl eine LISTE (z. B. ein Text pro Termin) in die Zwischenablage, legt iOS
// jeden Listeneintrag als eigenen Zwischenablage-Eintrag ab. navigator.clipboard.readText()
// liefert dann nur den ERSTEN davon – deshalb kam früher nur ein Termin an.
// navigator.clipboard.read() liefert dagegen alle Einträge; die setzen wir mit Zeilenumbrüchen zusammen.

export interface Zwischenablage {
  text: string
  eintraege: number // aus wie vielen Zwischenablage-Einträgen der Text besteht
}

export async function leseZwischenablage(): Promise<Zwischenablage> {
  // 1. Versuch: alle Einträge lesen (Safari/iOS ab 13.4, Chrome, Edge)
  if (navigator.clipboard?.read) {
    try {
      const eintraege = await navigator.clipboard.read()
      const texte: string[] = []
      for (const eintrag of eintraege) {
        if (eintrag.types.includes('text/plain')) texte.push(await (await eintrag.getType('text/plain')).text())
      }
      if (texte.length) return { text: texte.join('\n'), eintraege: texte.length }
    } catch (e) {
      // "Einfügen" abgelehnt -> genauso melden wie beim zweiten Versuch
      if ((e as Error).name === 'NotAllowedError') throw e
      // sonst (z. B. Browser kann read() nicht ganz): weiter mit readText()
    }
  }
  // 2. Versuch: nur Text (liefert bei mehreren Einträgen leider nur den ersten)
  return { text: await navigator.clipboard.readText(), eintraege: 1 }
}
