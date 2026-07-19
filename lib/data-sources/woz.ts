// Verplaatst → lib/data-sources/woningwaarde.ts
//
// Dit bestand bestond ooit als placeholder voor een WOZ-koppeling. Er is geen
// officiële/gratis WOZ-API (zie de toelichting in woningwaarde.ts), dus dit is
// vervangen door een echte, verifieerbare koppeling: Altum AI's Woningwaarde
// API (AVM). Dit bestand blijft alleen staan als re-export zodat een eventuele
// oude import niet stilzwijgend breekt; gebruik voortaan woningwaarde.ts.
export * from "./woningwaarde";
