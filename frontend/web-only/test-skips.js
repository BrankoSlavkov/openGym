// Upstream tests that cannot pass in this fork (FORK.md), left in place so syncs merge cleanly.
// SKIP_FILES: tests of the phone and watch apps (they read their native sources) and of the
// translation packs. SKIP_TESTS: single tests, by their full name ("describe > test"), that check
// another language or a native file inside an otherwise useful file.
// After a sync, a new failure that is about a removed part goes here; anything else is a real bug.
export const SKIP_FILES = [
  "src/lib/active-energy.test.js",
  "src/lib/android-asset-packs.test.js",
  "src/lib/android-backup.test.js",
  "src/lib/android-system-bars.test.js",
  "src/lib/android-widget-layouts.test.js",
  "src/lib/app-links.test.js",
  "src/lib/garmin-contract.test.js",
  "src/lib/garmin-link.e2e.test.js",
  "src/lib/i18n-details-lang.test.js",
  "src/lib/i18n-packs-parallel.test.js",
  "src/lib/ios-shake-undo.test.js",
  "src/lib/live-native-source.test.js",
  "src/lib/locale-id-vi.test.js",
  "src/lib/locale-plate-load.test.js",
  "src/lib/native-keyboard.test.js",
  "src/lib/pack-manifests.test.js",
  "src/lib/rest-alert-early.test.js",
  "src/lib/rest-alert.native.test.js",
  "src/lib/rest-sounds.test.js",
  "src/lib/voice-strings.test.js",
  "src/lib/watch-catalog.test.js",
  "src/lib/watch-next-weight.test.js",
  "src/lib/watch-sync.pause.test.js",
]

export const SKIP_TESTS = [
  // src/a11y-list-names.test.jsx
  "nameIn: the thing first, then the control > uses the language’s own colon",
  "nameIn: the thing first, then the control > isolates the inserted name in a right-to-left language, and leaves it alone elsewhere",
  "the sentences the names are built from > are in every language pack, placeholders intact",
  // src/components/DateField.test.jsx
  "DateField > speaks the UI language",
  // src/components/NumberField.locale.test.jsx
  "number field in de > shows a stored number with the separator the text beside it uses",
  "number field in de > takes \",\" typed as the decimal key and stores the same number",
  "number field in de > takes \".\" typed as the decimal key and stores the same number",
  "number field in de > keeps a half-typed number on screen (\"33\" then the separator)",
  "number field in de > reads a pasted \"1.234,5\" and \"1,234.5\" as 1234.5, never 1.2345 or 12345",
  "number field in de > keeps stepping with + and - and shows the result in the same notation",
  "number field in de > keeps a lb value exact through the kg round trip, whatever the separator",
  "number field in ru > shows a stored number with the separator the text beside it uses",
  "number field in ru > takes \",\" typed as the decimal key and stores the same number",
  "number field in ru > takes \".\" typed as the decimal key and stores the same number",
  "number field in ru > keeps a half-typed number on screen (\"33\" then the separator)",
  "number field in ru > reads a pasted \"1.234,5\" and \"1,234.5\" as 1234.5, never 1.2345 or 12345",
  "number field in ru > keeps stepping with + and - and shows the result in the same notation",
  "number field in ru > keeps a lb value exact through the kg round trip, whatever the separator",
  "number field in fr > shows a stored number with the separator the text beside it uses",
  "number field in fr > takes \",\" typed as the decimal key and stores the same number",
  "number field in fr > takes \".\" typed as the decimal key and stores the same number",
  "number field in fr > keeps a half-typed number on screen (\"33\" then the separator)",
  "number field in fr > reads a pasted \"1.234,5\" and \"1,234.5\" as 1234.5, never 1.2345 or 12345",
  "number field in fr > keeps stepping with + and - and shows the result in the same notation",
  "number field in fr > keeps a lb value exact through the kg round trip, whatever the separator",
  "number field across languages > re-renders with the new separator when the language is switched",
  "number field across languages > in a whole-number field the part after either separator never counts",
  "number field across languages > a paste that changed nothing does not turn the next keystroke into a paste",
  // src/lib/active-workout-order.test.js
  "active workout move locale coverage > defines both visible move labels in every current locale pack",
  // src/lib/api.test.js
  "bio > reads the platform phrase in the UI language",
  "passkeyError > says each refusal in the UI language",
  "a write refused for the wrong address > says which address the server expects, in the UI language",
  // src/lib/bidi.test.js
  "right to left (ar) > isolates a set, a weight and a volume as one left-to-right run",
  "right to left (ar) > keeps a set with words of the page in its own direction, its numbers still in order",
  "right to left (ar) > puts the lifts list of a share card in order",
  "right to left (fa) > isolates a set, a weight and a volume as one left-to-right run",
  "right to left (fa) > keeps a set with words of the page in its own direction, its numbers still in order",
  "right to left (fa) > puts the lifts list of a share card in order",
  // src/lib/channel.test.js
  "install channel > the Play flavour says \"play\" and leaves the updater out",
  "install channel > the F-Droid flavour carries nothing from Google Play services",
  // src/lib/coach-api.i18n.test.js
  "a language picked after coach-api.js loaded > changes what the same map says, and switching back restores the English",
  "a language picked after coach-api.js loaded > reaches the own-key phone lines, with the provider detail still attached",
  // src/lib/da-locale.test.js
  "Danish locale > is selectable, with Danish dates, and a Danish browser picks it",
  "Danish locale > speaks Danish, keeps the contributor’s words and the numbers in their sentences",
  // src/lib/default-lang.effective.test.js
  "effectiveLang > gives an unpicked copy the instance default, then the browser's language",
  "effectiveLang > before the config is in, uses the default this device saw last",
  "effectiveLang > reads a remembered \"no default\" as no default, not as unknown",
  // src/lib/default-lang.test.js
  "matchLocale > matches the full tag first, in any case or separator",
  "matchLocale > falls back to the base language, and to nothing for one the app does not have",
  "matchLocale > reads the Traditional Chinese tags as zh-TW and the rest of Chinese as zh",
  "autoLang > puts DEFAULT_LANG before the browser, the browser before English",
  // src/lib/delete-workouts.test.js
  "delete workouts only > the sheet says what stays, runs and recovery sessions included, in every language (QA2 1.4.5)",
  // src/lib/exercise-names.test.js
  "ar exercise names > shows the translation first with the English title in parentheses, and can hide or replace it",
  "bn exercise names > shows the translation first with the English title in parentheses, and can hide or replace it",
  "cs exercise names > shows the translation first with the English title in parentheses, and can hide or replace it",
  "da exercise names > shows the translation first with the English title in parentheses, and can hide or replace it",
  "de exercise names > shows the translation first with the English title in parentheses, and can hide or replace it",
  "es exercise names > shows the translation first with the English title in parentheses, and can hide or replace it",
  "fa exercise names > shows the translation first with the English title in parentheses, and can hide or replace it",
  "fr exercise names > shows the translation first with the English title in parentheses, and can hide or replace it",
  "hi exercise names > shows the translation first with the English title in parentheses, and can hide or replace it",
  "hu exercise names > shows the translation first with the English title in parentheses, and can hide or replace it",
  "it exercise names > shows the translation first with the English title in parentheses, and can hide or replace it",
  "ko exercise names > shows the translation first with the English title in parentheses, and can hide or replace it",
  "pl exercise names > shows the translation first with the English title in parentheses, and can hide or replace it",
  "pt exercise names > shows the translation first with the English title in parentheses, and can hide or replace it",
  "pt-BR exercise names > shows the translation first with the English title in parentheses, and can hide or replace it",
  "ru exercise names > shows the translation first with the English title in parentheses, and can hide or replace it",
  "sv exercise names > shows the translation first with the English title in parentheses, and can hide or replace it",
  "th exercise names > shows the translation first with the English title in parentheses, and can hide or replace it",
  "tr exercise names > shows the translation first with the English title in parentheses, and can hide or replace it",
  "uk exercise names > shows the translation first with the English title in parentheses, and can hide or replace it",
  "zh exercise names > shows the translation first with the English title in parentheses, and can hide or replace it",
  "zh-TW exercise names > shows the translation first with the English title in parentheses, and can hide or replace it",
  // src/lib/exercises.test.js
  "matchExercise > matches translated UI terms when a language is active",
  "matchExercise > matches the localized exercise name as well as the English one",
  "matchExercise > rebuilds the cached haystack when the language changes",
  "search with the pt and sv exercise-name packs > pt: \"supino com barra\" finds the exercise",
  "search with the pt and sv exercise-name packs > pt: \"peso morto barra\" finds the exercise",
  "search with the pt and sv exercise-name packs > pt: \"gemeos sentado\" finds the exercise",
  "search with the pt and sv exercise-name packs > sv: \"bänkpress skivstång\" finds the exercise",
  "search with the pt and sv exercise-name packs > sv: \"marklyft\" finds the exercise",
  "search with the pt and sv exercise-name packs > sv: \"bankpress\" finds the exercise",
  "search with the pt and sv exercise-name packs > sv: \"sittande vadpress\" finds the exercise",
  // src/lib/format-ago.test.js
  "setsWorkCount > and the packs carry it",
  "fmtDur > uses each pack's own units",
  "fmtDaysAgo > in the UI language, from the platform",
  // src/lib/format-names.test.js
  "exerciseNameText > title-cases a name from a lower-case pack, the English one in parentheses included",
  "exerciseNameText > leaves German as the pack writes it",
  // src/lib/garmin-snapshot.test.js
  "the Garmin snapshot > is the fixture the watch is written against",
  "the Garmin snapshot > keeps the same fields as the other watches, with where each exercise sits",
  "the Garmin snapshot > carries the redesign look (accent, crown, effort) only when the phone has it",
  "the Garmin snapshot > lists the other routines by name only",
  "the Garmin snapshot > sends today by name only while a workout runs (the snapshot with every set stays small)",
  "the Garmin snapshot > carries the newest acked ids, a short list, and never cuts them for size",
  // src/lib/health-connect.test.js
  "the native tables > ../../ios/App/App/AppleHealthPlugin.swift knows every type",
  "the native tables > ../../ios/App/Watch/WorkoutManager.swift knows every type",
  "the native tables > Health Connect knows every type it has a constant for",
  // src/lib/health-segments.test.js
  "segmentType > only hands out types the native side maps",
  // src/lib/i18n-core.test.js
  "derivePack > derives the whole German locale with no ß left and no key lost",
  "de-CH as a selectable language > is offered in the picker and formats numbers Swiss-style",
  "de-CH as a selectable language > stays the active language rather than collapsing to its base",
  "de-CH as a selectable language > ships no locale pack of its own, so nothing can shadow the derivation",
  "exerciseNameClass > title-cases only while the English fallback is showing",
  "exerciseNameClass > decides per exercise, so an untranslated one in a partial pack keeps its casing",
  "title-casing per exercise-name pack > cs: a translated name is left in its own casing",
  "title-casing per exercise-name pack > de: a translated name is left in its own casing",
  "title-casing per exercise-name pack > de-CH: a translated name is left in its own casing",
  "English-name switches with every exercise-name pack > ar: parentheses off shows the translation alone, English only shows the English title",
  "English-name switches with every exercise-name pack > bn: parentheses off shows the translation alone, English only shows the English title",
  "English-name switches with every exercise-name pack > cs: parentheses off shows the translation alone, English only shows the English title",
  "English-name switches with every exercise-name pack > da: parentheses off shows the translation alone, English only shows the English title",
  "English-name switches with every exercise-name pack > de: parentheses off shows the translation alone, English only shows the English title",
  "English-name switches with every exercise-name pack > es: parentheses off shows the translation alone, English only shows the English title",
  "English-name switches with every exercise-name pack > fa: parentheses off shows the translation alone, English only shows the English title",
  "English-name switches with every exercise-name pack > fr: parentheses off shows the translation alone, English only shows the English title",
  "English-name switches with every exercise-name pack > hi: parentheses off shows the translation alone, English only shows the English title",
  "English-name switches with every exercise-name pack > hu: parentheses off shows the translation alone, English only shows the English title",
  "English-name switches with every exercise-name pack > it: parentheses off shows the translation alone, English only shows the English title",
  "English-name switches with every exercise-name pack > ko: parentheses off shows the translation alone, English only shows the English title",
  "English-name switches with every exercise-name pack > pl: parentheses off shows the translation alone, English only shows the English title",
  "English-name switches with every exercise-name pack > pt: parentheses off shows the translation alone, English only shows the English title",
  "English-name switches with every exercise-name pack > pt-BR: parentheses off shows the translation alone, English only shows the English title",
  "English-name switches with every exercise-name pack > ru: parentheses off shows the translation alone, English only shows the English title",
  "English-name switches with every exercise-name pack > sv: parentheses off shows the translation alone, English only shows the English title",
  "English-name switches with every exercise-name pack > th: parentheses off shows the translation alone, English only shows the English title",
  "English-name switches with every exercise-name pack > tr: parentheses off shows the translation alone, English only shows the English title",
  "English-name switches with every exercise-name pack > uk: parentheses off shows the translation alone, English only shows the English title",
  "English-name switches with every exercise-name pack > zh: parentheses off shows the translation alone, English only shows the English title",
  "English-name switches with every exercise-name pack > zh-TW: parentheses off shows the translation alone, English only shows the English title",
  // src/lib/i18n-plural.test.js
  "tn() — plural forms from the pack > leaves a pack that answers with a plain string exactly as it was",
  "tn() — plural forms from the pack > picks Russian one / few / many by the CLDR rule, not by n === 1",
  "tn() — plural forms from the pack > fills every placeholder, not just the count",
  "tn() — plural forms from the pack > reads the forms off the plural key, so a singular-only key needs no entry",
  "tn() — plural forms from the pack > does not crash when a plural key is read through plain t()",
  "tn() — plural forms from the pack > gives every tn() key real one / few / many forms in ru, uk and pl (#365)",
  "tn() — plural forms from the pack > says \"3 treningi\" in Polish and \"3 дні\" in Ukrainian",
  // src/lib/live-layout.test.js
  "the catalogue > has every label in every language pack (they are passed to t() by name)",
  // src/lib/locale-fa.test.js
  "Persian language selection > offers Persian and recognizes browser and instance language tags",
  "Persian language selection > loads real Persian strings, sets RTL, and restores English and LTR",
  "Persian language selection > uses Gregorian months and Latin digits in dates and numbers",
  "Persian language selection > prints Persian with RTL layout and Gregorian dates",
  "Persian language selection > keeps small and coach separate when reviewing Persian terminology",
  "Persian exercise catalogue > isolates English names in parentheses, searches both languages, and honors display preferences",
  // src/lib/locale-id.test.js
  "Indonesian (id) locale pack is wired up > is offered in the picker and has a date locale",
  "Indonesian (id) locale pack is wired up > an Indonesian device gets Bahasa Indonesia, with Indonesian dates",
  // src/lib/locale-sv.test.js
  "every locale pack is wired up > a Swedish phone gets Swedish, with Swedish dates",
  // src/lib/lt-locale.test.js
  "Lithuanian locale > is selectable and uses Lithuanian date and plural rules",
  "Lithuanian locale > keeps context-sensitive fitness terms and both passkey sentences coherent",
  "Lithuanian locale > handles zero, teen, plural and decimal change counts",
  "Lithuanian locale > distinguishes notification delivery from scheduled reminders",
  "Lithuanian locale > keeps v1.4.4 fitness copy accurate and fractional plurals grammatical",
  // src/lib/media-limits.test.js
  "fmtMB > writes the decimal mark of the language",
  // src/lib/media-sync.test.js
  "syncMedia > the full-quota toast gives the space used as the server and Settings do, one decimal in the language's own mark",
  // src/lib/muscle-filter.test.js
  "the muscle filter > a group is named as a body part, never as the way back (Rücken, not Zurück)",
  // src/lib/number-input.test.js
  "the separator a number field shows > de uses \",\"",
  "the separator a number field shows > ru uses \",\"",
  "the separator a number field shows > fr uses \",\"",
  "the separator a number field shows > uk uses \",\"",
  "the separator a number field shows > pt-BR uses \",\"",
  "the separator a number field shows > sv uses \",\"",
  "the separator a number field shows > never puts a grouping sign into a field, and leaves anything that is not a number alone",
  // src/lib/orientation.test.js
  "screen orientation (#821) > the activity applies the saved choice before the page loads, and the app re-applies it",
  // src/lib/plan-print.test.js
  "planPrintHTML exercise-name casing per language > cs: no title-casing on the translated name",
  "planPrintHTML exercise-name casing per language > de: no title-casing on the translated name",
  "planPrintHTML prints the exercise as it is prescribed > translates the body part and keeps it a separate word",
  "planPrintHTML page breaks > puts the English title of a translated name on its own line instead of in parentheses",
  "planPrintHTML page breaks > carries page numbers in the reader’s language and no probe marks unless asked",
  // src/lib/print-doc.native.test.js
  "printing on the phone (#991) > the plugin catches what used to crash the app",
  // src/lib/print-doc.test.js
  "print-doc > builds the page-number line from the translation, numbers anywhere in it",
  // src/lib/pt-br-locale.test.js
  "Brazilian Portuguese locale > is a separately selectable locale with Brazilian date formatting",
  "Brazilian Portuguese locale > makes every inherited pt-PT value an explicit reviewed snapshot",
  "Brazilian Portuguese locale > does not label Unpair with an Undo word in either Portuguese pack",
  "Brazilian Portuguese locale > does not leak European Portuguese UI terms",
  // src/lib/stage-media.test.js
  "staging the app's animations (#962) > the IPA check counts animations, not stills",
  // src/lib/system-bars.test.js
  "system bars follow the theme on Android > the app sends every resolved theme, and the activity registers the plugin",
  "the accent reaches what Android draws itself (#980) > the stylesheet colours the selection and the caret, and the activity lays the accent over its theme",
  // src/lib/watch-sync.offline.test.js
  "the fixture > is a whole workout as the Wear OS watch sends it: numbered, one id each",
  "a workout logged on the watch with no phone at all > lands in the history complete when it all arrives at once, in order",
  "a workout logged on the watch with no phone at all > in pieces, out of order and twice over: sets before their start wait, the finish overtakes sets, the end is the same",
  "a workout logged on the watch with no phone at all > the app killed between applying and acknowledging: the queue hands everything over again, nothing counts twice",
  "a workout logged on the watch with no phone at all > killed mid-drain, before the list of applied ids was written: applying it all again changes nothing",
  "a workout logged on the watch with no phone at all > the workout screen not open yet: the queue keeps everything until it is, then drains",
  // src/lib/watch-sync.protocol.test.js
  "the Apple Watch never applies an older snapshot over a newer one > every snapshot the watch gets goes through receive(), which checks the phone stamp",
  "the Apple Watch reads a paused rest in the phone's unit > the phone sends seconds and the watch takes them as seconds",
  "a rest paused on the phone, on the Apple Watch > keeps Skip, greys out ±15 and runs no countdown in the complication",
  // src/lib/watch-sync.wear.test.js
  "the snapshot the Wear OS watch parses > is the fixture its Kotlin test reads",
  "the events the Wear OS watch sends > are applied through the page's own actions, like the Apple Watch's",
  "the events the Wear OS watch sends > start a routine on the phone with the watch's id",
  // src/lib/workout-text.test.js
  "workoutText exercise names per language > keeps German as the pack writes it and title-cases the lower-case packs",
  // src/seasonal/advent-doors.test.js
  "the doors > every string behind a door is in every locale pack",
  // src/sheets.add-device-data.test.jsx
  "addDeviceDataMessage > uses the singular sentences of the language packs",
  "addDeviceDataMessage > a plan made while signed out has words of its own",
  // src/sheets.muscle-names.test.jsx
  "muscle names in the rows and tags (QA C9) > translates them in German too — \"forearm\" was staying English",
  "muscle names in the rows and tags (QA C9) > keeps the cardio target translated (marching on the spot, de)",
  // src/sheets.weighin-locale.test.jsx
  "weigh-in sheet separators > de: field, chips and slider agree on \",\"",
  "weigh-in sheet separators > ru: field, chips and slider agree on \",\"",
  "weigh-in sheet separators > fr: field, chips and slider agree on \",\"",
  // src/store/useStore.default-lang.test.jsx
  "instance default language > a fresh copy is shown in DEFAULT_LANG once the config is in, and its state is left alone",
  "instance default language > the next boot uses the default this device last saw, before the config answers",
  "instance default language > without DEFAULT_LANG a fresh copy follows the browser when the app speaks it",
  "instance default language > a language picked in Settings wins over DEFAULT_LANG from then on",
  // src/views/CoachIntake.test.jsx
  "CoachIntake — the consent screen > names every category in the app’s language",
  "CoachIntake — the two answers that gate the flow > names and describes every goal and starting point in the app’s language",
  // src/views/Home.queue.test.jsx
  "Home: your own loop > is called Rotation in the language on screen, whatever an older save kept as its name",
  // src/views/Library.test.jsx
  "Library exercise-name casing per language > ar: every translated row is title-cased",
  "Library exercise-name casing per language > bn: every translated row is title-cased",
  "Library exercise-name casing per language > cs: every translated row is left in its own casing",
  "Library exercise-name casing per language > de: every translated row is left in its own casing",
  "Library exercise-name casing per language > es: every translated row is title-cased",
  "Library exercise-name casing per language > fa: every translated row is title-cased",
  "Library exercise-name casing per language > fr: every translated row is title-cased",
  "Library exercise-name casing per language > hi: every translated row is title-cased",
  "Library exercise-name casing per language > hu: every translated row is title-cased",
  "Library exercise-name casing per language > ko: every translated row is title-cased",
  "Library exercise-name casing per language > pl: every translated row is title-cased",
  "Library exercise-name casing per language > pt: every translated row is title-cased",
  "Library exercise-name casing per language > pt-BR: every translated row is title-cased",
  "Library exercise-name casing per language > ru: every translated row is title-cased",
  "Library exercise-name casing per language > th: every translated row is title-cased",
  "Library exercise-name casing per language > uk: every translated row is title-cased",
  "Library exercise-name casing per language > zh: every translated row is title-cased",
  "Library exercise-name casing per language > zh-TW: every translated row is title-cased",
  "Library header count > uses the language's own plural forms (Russian: 1 своё, 2 своих, 5 своих)",
  // src/views/RoutineEdit.move.test.jsx
  "routine move controls > uses localized accessible names and titles, retains button focus, and does not open config",
  // src/views/settings-pages.test.jsx
  "the root > is an account card and one row per page, in the four groups, with value previews",
  "the search lands on a row > guest in a browser",
  "the search lands on a row > signed in, browser without push",
  "the search lands on a row > phone, reminder off",
  "the search lands on a row > phone, reminder and nudge on",
  "the search lands on a row > phone paired with a server",
  "the search lands on a row > finds Text size by font, text, size and bigger, in every language",
  "the pages > each search entry is a row on its page (guest in a browser)",
  "searchSettings > finds the translated choices of a row, and words of its own language",
  "searchSettings > English words match from the start of a word only, so \"ton\" never finds \"buttons\"",
  // src/views/Settings.startfrom.test.jsx
  "Settings — planned sessions start from > adds the new subtitle to every locale and removes the old key",
  // src/views/Workout.remove.test.jsx
  "remove-exercise locale coverage > defines every new prompt in every non-English locale pack",
  // src/views/Workout.swipe.test.jsx
  "the swipe panes’ words > the copy pane says the verb in every pack where the noun is another word",
  // src/views/Workout.test.jsx
  "Workout exercise tags > keeps the cardio target translated (burpee, de)",
  "the reference line: last time or best set > leaves a set with right-to-left words in its own direction",
]
