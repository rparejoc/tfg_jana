import { computed, ref, watch } from 'vue'

const THEME_STORAGE_KEY = 'famtrip.theme'
const LOCALE_STORAGE_KEY = 'famtrip.locale'

const isBrowser = typeof window !== 'undefined'
const supportedThemes = ['light', 'dark']
const supportedLocales = ['en', 'es']

const messages = {
  en: {
    'nav.dashboard': 'Dashboard',
    'nav.family': 'Family',
    'nav.logout': 'Logout',
    'nav.noEmail': 'No email',
    'role.admin': 'admin',
    'role.member': 'member',
    'theme.light': 'Light',
    'theme.dark': 'Night',
    'theme.toggleToLight': 'Switch to light mode',
    'theme.toggleToDark': 'Switch to night mode',
    'language.label': 'Language',
    'language.en': 'English',
    'language.es': 'Spanish',
    'auth.heroTitle': 'Plan trips, collect memories, and keep the whole family in sync.',
    'auth.heroSubtitle': 'Access your shared dashboard to organize destinations, dates, photos, and family plans from one simple place.',
    'auth.stepCreate': 'Create a trip',
    'auth.stepInvite': 'Invite family',
    'auth.stepShare': 'Share photos',
    'auth.access': 'FamTrip access',
    'auth.welcomeBack': 'Welcome back',
    'auth.createAccountTitle': 'Create your account',
    'auth.loginSubtitle': 'Sign in to keep planning and sharing your family trips.',
    'auth.registerSubtitle': 'Join FamTrip and start building family travel memories.',
    'auth.signingIn': 'Signing in...',
    'auth.creatingAccount': 'Creating account...',
    'auth.signIn': 'Sign in',
    'auth.createAccount': 'Create account',
    'auth.newAccount': 'New to FamTrip? Create an account',
    'auth.existingAccount': 'Already have an account? Sign in',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.checkingSession': 'Checking session...',
    'dashboard.title': 'Trip Dashboard',
    'dashboard.subtitle': 'All your family adventures in one place.',
    'dashboard.createTrip': 'Create Trip',
    'dashboard.loading': 'Loading trips...',
    'dashboard.chooseFamily': 'Choose an active family first to see trips.',
    'dashboard.empty': 'No trips yet.',
    'dashboard.untitled': 'Untitled trip',
    'dashboard.datesNotSet': 'Dates not set',
    'dashboard.until': 'Until {date}',
    'dashboard.from': 'From {date}',
    'dashboard.photos': '{count} photos',
    'dashboard.locations': '{count} locations',
    'family.hub': 'Family hub',
    'family.title': 'Organize your families',
    'family.subtitle': 'Create a group, join with a code, or switch your active family before planning the next trip.',
    'family.loading': 'Loading families...',
    'family.noActive': 'You do not have an active family yet',
    'family.noActiveHelp': 'Start by creating a new family or paste an invite code someone sent you to join an existing one.',
    'family.yourFamilies': 'Your families',
    'family.familyCount': '{count} families',
    'family.familySingle': '{count} family',
    'family.memberLabel': 'members',
    'family.active': 'Active',
    'family.memberCount': '{count} members',
    'family.makeActive': 'Make active',
    'family.membersUnavailable': 'Members unavailable',
    'family.createTitle': 'Create family',
    'family.createHelp': 'Start a private group for your household or travel crew.',
    'family.familyName': 'Family name',
    'family.familyNamePlaceholder': 'The Johnson family',
    'family.creating': 'Creating...',
    'family.create': 'Create family',
    'family.joinTitle': 'Join with invite code',
    'family.joinHelp': 'Paste the invite code shared by a family member.',
    'family.inviteCode': 'Invite code',
    'family.invitePlaceholder': 'ABC123',
    'family.joining': 'Joining...',
    'family.join': 'Join family',
    'trip.common.participants': 'participants',
    'trip.common.locations': 'locations',
    'trip.common.photos': 'photos',
    'trip.common.initialPhotos': 'initial photos',
    'trip.common.step': 'Step {number}',
    'trip.common.required': 'Required',
    'trip.common.details': 'Trip details',
    'trip.common.title': 'Title',
    'trip.common.titlePlaceholder': 'Summer vacation',
    'trip.common.description': 'Description',
    'trip.common.descriptionPlaceholder': 'A simple family trip with stops, photos, and shared plans.',
    'trip.common.startDate': 'Start date',
    'trip.common.endDate': 'End date',
    'trip.common.locationsWeather': 'Locations and weather',
    'trip.common.addedCount': '{count} added',
    'trip.common.searchLocation': 'Search location',
    'trip.common.searchPlaceholder': 'Search city or place',
    'trip.common.searching': 'Searching...',
    'trip.common.search': 'Search',
    'trip.common.select': 'Select',
    'trip.common.addedLocations': 'Added locations',
    'trip.common.remove': 'Remove',
    'trip.common.noLocations': 'You have not added any locations yet.',
    'trip.common.summary': 'Summary',
    'trip.common.dates': 'Dates',
    'trip.common.start': 'Start',
    'trip.common.end': 'End',
    'trip.common.typeLocation': 'Type a location to search.',
    'trip.common.noResults': 'No results found for this search.',
    'trip.common.duplicateLocation': 'This location is already added.',
    'trip.common.permissionDenied': 'You do not have permission to edit this trip.',
    'trip.create.eyebrow': 'New family trip',
    'trip.create.title': 'Create a complete adventure',
    'trip.create.subtitle': 'Add dates, participants, locations with their forecast, and memories so the whole family has the trip organized from the start.',
    'trip.create.loadingContext': 'Loading family and participants...',
    'trip.create.uploadingPhotos': 'Uploading photos...',
    'trip.create.participantsHelp': 'Choose which family members will be part of the trip.',
    'trip.create.selectedCount': '{count} selected',
    'trip.create.loadingParticipants': 'Loading participants...',
    'trip.create.creatorIncluded': 'Creator included',
    'trip.create.member': 'member',
    'trip.create.included': 'Included',
    'trip.create.add': 'Add',
    'trip.create.noParticipants': 'No family members are available yet. The creator will be added automatically.',
    'trip.create.locationsHelp': 'Search for destinations. When saved, each location will keep its associated weather forecast.',
    'trip.create.weatherSaved': 'Weather will be saved for the trip start date.',
    'trip.create.weatherBoxTitle': 'Weather by location',
    'trip.create.weatherBoxHelp': 'When the trip is created, the forecast will be retrieved and saved with each destination.',
    'trip.create.initialPhotosTitle': 'Initial photos',
    'trip.create.initialPhotosHelp': 'You can attach memories now or add them later.',
    'trip.create.creating': 'Creating trip...',
    'trip.create.submit': 'Create Trip',
    'trip.create.weatherPartialError': 'Trip will be created, but some weather data could not be loaded.',
    'trip.create.mustSignIn': 'You must be signed in to create a trip.',
    'trip.create.noActiveFamily': 'Select or create an active family before creating a trip.',
    'trip.create.unableCreate': 'Unable to create trip right now.',
    'trip.create.uploadPartial': 'Trip created, but {count} photo(s) failed to upload: {failures}{remaining}.',
    'trip.create.moreFailures': ' ({count} more)',
    'trip.create.photoProcessingFailed': 'Trip created, but photo processing failed.',
    'trip.edit.eyebrow': 'Family trip editor',
    'trip.edit.title': 'Edit your adventure',
    'trip.edit.subtitle': 'Keep the same trip structure while updating dates, details, and destinations for the whole family.',
    'trip.edit.loadingTrip': 'Loading trip...',
    'trip.edit.unableLoad': 'Unable to load this trip.',
    'trip.edit.locationsHelp': 'Search for destinations and adjust the saved stops for this trip.',
    'trip.edit.savedWeather': 'Saved weather data is kept with existing destinations.',
    'trip.edit.summaryTitle': 'Editing existing trip',
    'trip.edit.summaryHelp': 'Participants and photos stay linked to the trip while you update the core itinerary.',
    'trip.edit.saving': 'Saving changes...',
    'trip.edit.submit': 'Save changes',
    'trip.edit.unableUpdate': 'Unable to update trip right now.',
    'trip.detail.datesUnavailable': 'Dates unavailable',
    'trip.detail.memoryFrom': 'Memory from {location}',
    'trip.detail.tripMemory': 'Trip memory {number}',
    'trip.detail.unknownLocation': 'Unknown location',
    'trip.detail.noForecast': 'No forecast',
    'trip.detail.datePending': 'Date pending',
    'trip.detail.unableLoad': 'Unable to load this trip.',
    'trip.detail.deleteConfirm': 'Are you sure you want to delete this trip?',
    'trip.detail.unableDelete': 'Unable to delete this trip right now.',
    'trip.detail.loading': 'Loading trip details...',
    'trip.detail.eyebrow': 'Trip detail',
    'trip.detail.noDescription': 'No description provided.',
    'trip.detail.edit': 'Edit Trip',
    'trip.detail.deleting': 'Deleting...',
    'trip.detail.delete': 'Delete Trip',
    'trip.detail.noParticipants': 'No participants available.',
    'trip.detail.route': 'Route',
    'trip.detail.tripRoute': 'Trip Route',
    'trip.detail.stops': 'Stops',
    'trip.detail.locationsVisited': 'Locations Visited',
    'trip.detail.stopDescription': 'Stop {current} of the route with saved coordinates for the family itinerary.',
    'trip.detail.noLocations': 'No locations saved for this trip.',
    'trip.detail.forecast': 'Forecast',
    'trip.detail.weatherOverview': 'Weather Overview',
    'trip.detail.noWeather': 'No weather data available.',
    'trip.detail.memories': 'Memories',
    'trip.detail.photoGallery': 'Photo Gallery',
    'trip.detail.noPhotos': 'No photos uploaded for this trip.',
    'photo.tripPhotos': 'Trip photos',
    'photo.remove': 'Remove',
    'map.selectedLocation': 'Selected location',
  },
  es: {
    'nav.dashboard': 'Panel',
    'nav.family': 'Familia',
    'nav.logout': 'Cerrar sesión',
    'nav.noEmail': 'Sin email',
    'role.admin': 'administrador',
    'role.member': 'miembro',
    'theme.light': 'Luz',
    'theme.dark': 'Noche',
    'theme.toggleToLight': 'Cambiar a modo con luz',
    'theme.toggleToDark': 'Cambiar a modo nocturno',
    'language.label': 'Idioma',
    'language.en': 'Inglés',
    'language.es': 'Español',
    'auth.heroTitle': 'Planifica viajes, guarda recuerdos y mantén a toda la familia coordinada.',
    'auth.heroSubtitle': 'Accede a tu panel compartido para organizar destinos, fechas, fotos y planes familiares en un único lugar sencillo.',
    'auth.stepCreate': 'Crea un viaje',
    'auth.stepInvite': 'Invita a la familia',
    'auth.stepShare': 'Comparte fotos',
    'auth.access': 'Acceso a FamTrip',
    'auth.welcomeBack': 'Bienvenido de nuevo',
    'auth.createAccountTitle': 'Crea tu cuenta',
    'auth.loginSubtitle': 'Inicia sesión para seguir planificando y compartiendo tus viajes familiares.',
    'auth.registerSubtitle': 'Únete a FamTrip y empieza a construir recuerdos de viajes en familia.',
    'auth.signingIn': 'Iniciando sesión...',
    'auth.creatingAccount': 'Creando cuenta...',
    'auth.signIn': 'Iniciar sesión',
    'auth.createAccount': 'Crear cuenta',
    'auth.newAccount': '¿Nuevo en FamTrip? Crea una cuenta',
    'auth.existingAccount': '¿Ya tienes cuenta? Inicia sesión',
    'auth.email': 'Email',
    'auth.password': 'Contraseña',
    'auth.checkingSession': 'Comprobando sesión...',
    'dashboard.title': 'Panel de viajes',
    'dashboard.subtitle': 'Todas tus aventuras familiares en un solo lugar.',
    'dashboard.createTrip': 'Crear viaje',
    'dashboard.loading': 'Cargando viajes...',
    'dashboard.chooseFamily': 'Elige primero una familia activa para ver los viajes.',
    'dashboard.empty': 'Aún no hay viajes.',
    'dashboard.untitled': 'Viaje sin título',
    'dashboard.datesNotSet': 'Fechas sin definir',
    'dashboard.until': 'Hasta {date}',
    'dashboard.from': 'Desde {date}',
    'dashboard.photos': '{count} fotos',
    'dashboard.locations': '{count} destinos',
    'family.hub': 'Centro familiar',
    'family.title': 'Organiza tus familias',
    'family.subtitle': 'Crea un grupo, únete con un código o cambia tu familia activa antes de planificar el próximo viaje.',
    'family.loading': 'Cargando familias...',
    'family.noActive': 'Todavía no tienes una familia activa',
    'family.noActiveHelp': 'Empieza creando una nueva familia o pega un código de invitación para unirte a una existente.',
    'family.yourFamilies': 'Tus familias',
    'family.familyCount': '{count} familias',
    'family.familySingle': '{count} familia',
    'family.memberLabel': 'miembros',
    'family.active': 'Activa',
    'family.memberCount': '{count} miembros',
    'family.makeActive': 'Hacer activa',
    'family.membersUnavailable': 'Miembros no disponibles',
    'family.createTitle': 'Crear familia',
    'family.createHelp': 'Inicia un grupo privado para tu hogar o compañeros de viaje.',
    'family.familyName': 'Nombre de la familia',
    'family.familyNamePlaceholder': 'La familia García',
    'family.creating': 'Creando...',
    'family.create': 'Crear familia',
    'family.joinTitle': 'Unirse con código',
    'family.joinHelp': 'Pega el código de invitación compartido por un familiar.',
    'family.inviteCode': 'Código de invitación',
    'family.invitePlaceholder': 'ABC123',
    'family.joining': 'Uniéndose...',
    'family.join': 'Unirse a familia',
    'trip.common.participants': 'participantes',
    'trip.common.locations': 'destinos',
    'trip.common.photos': 'fotos',
    'trip.common.initialPhotos': 'fotos iniciales',
    'trip.common.step': 'Paso {number}',
    'trip.common.required': 'Obligatorio',
    'trip.common.details': 'Detalles del viaje',
    'trip.common.title': 'Título',
    'trip.common.titlePlaceholder': 'Vacaciones de verano',
    'trip.common.description': 'Descripción',
    'trip.common.descriptionPlaceholder': 'Un viaje familiar sencillo con paradas, fotos y planes compartidos.',
    'trip.common.startDate': 'Fecha de inicio',
    'trip.common.endDate': 'Fecha de fin',
    'trip.common.locationsWeather': 'Destinos y clima',
    'trip.common.addedCount': '{count} añadidos',
    'trip.common.searchLocation': 'Buscar destino',
    'trip.common.searchPlaceholder': 'Buscar ciudad o lugar',
    'trip.common.searching': 'Buscando...',
    'trip.common.search': 'Buscar',
    'trip.common.select': 'Seleccionar',
    'trip.common.addedLocations': 'Destinos añadidos',
    'trip.common.remove': 'Eliminar',
    'trip.common.noLocations': 'Todavía no has añadido destinos.',
    'trip.common.summary': 'Resumen',
    'trip.common.dates': 'Fechas',
    'trip.common.start': 'Inicio',
    'trip.common.end': 'Fin',
    'trip.common.typeLocation': 'Escribe un destino para buscar.',
    'trip.common.noResults': 'No se encontraron resultados para esta búsqueda.',
    'trip.common.duplicateLocation': 'Este destino ya está añadido.',
    'trip.common.permissionDenied': 'No tienes permiso para editar este viaje.',
    'trip.create.eyebrow': 'Nuevo viaje familiar',
    'trip.create.title': 'Crea una aventura completa',
    'trip.create.subtitle': 'Añade fechas, participantes, destinos con su previsión y recuerdos para que toda la familia tenga el viaje organizado desde el principio.',
    'trip.create.loadingContext': 'Cargando familia y participantes...',
    'trip.create.uploadingPhotos': 'Subiendo fotos...',
    'trip.create.participantsHelp': 'Elige qué familiares formarán parte del viaje.',
    'trip.create.selectedCount': '{count} seleccionados',
    'trip.create.loadingParticipants': 'Cargando participantes...',
    'trip.create.creatorIncluded': 'Creador incluido',
    'trip.create.member': 'miembro',
    'trip.create.included': 'Incluido',
    'trip.create.add': 'Añadir',
    'trip.create.noParticipants': 'Aún no hay familiares disponibles. El creador se añadirá automáticamente.',
    'trip.create.locationsHelp': 'Busca destinos. Al guardar, cada destino conservará su previsión meteorológica asociada.',
    'trip.create.weatherSaved': 'El clima se guardará para la fecha de inicio del viaje.',
    'trip.create.weatherBoxTitle': 'Clima por destino',
    'trip.create.weatherBoxHelp': 'Cuando se cree el viaje, se recuperará la previsión y se guardará con cada destino.',
    'trip.create.initialPhotosTitle': 'Fotos iniciales',
    'trip.create.initialPhotosHelp': 'Puedes adjuntar recuerdos ahora o añadirlos más tarde.',
    'trip.create.creating': 'Creando viaje...',
    'trip.create.submit': 'Crear viaje',
    'trip.create.weatherPartialError': 'El viaje se creará, pero algunos datos del clima no se pudieron cargar.',
    'trip.create.mustSignIn': 'Debes iniciar sesión para crear un viaje.',
    'trip.create.noActiveFamily': 'Selecciona o crea una familia activa antes de crear un viaje.',
    'trip.create.unableCreate': 'No se puede crear el viaje ahora mismo.',
    'trip.create.uploadPartial': 'El viaje se creó, pero {count} foto(s) no se pudieron subir: {failures}{remaining}.',
    'trip.create.moreFailures': ' ({count} más)',
    'trip.create.photoProcessingFailed': 'El viaje se creó, pero el procesamiento de fotos falló.',
    'trip.edit.eyebrow': 'Editor de viaje familiar',
    'trip.edit.title': 'Edita tu aventura',
    'trip.edit.subtitle': 'Mantén la misma estructura del viaje mientras actualizas fechas, detalles y destinos para toda la familia.',
    'trip.edit.loadingTrip': 'Cargando viaje...',
    'trip.edit.unableLoad': 'No se puede cargar este viaje.',
    'trip.edit.locationsHelp': 'Busca destinos y ajusta las paradas guardadas para este viaje.',
    'trip.edit.savedWeather': 'Los datos de clima guardados se conservan con los destinos existentes.',
    'trip.edit.summaryTitle': 'Editando viaje existente',
    'trip.edit.summaryHelp': 'Los participantes y las fotos permanecen vinculados al viaje mientras actualizas el itinerario principal.',
    'trip.edit.saving': 'Guardando cambios...',
    'trip.edit.submit': 'Guardar cambios',
    'trip.edit.unableUpdate': 'No se puede actualizar el viaje ahora mismo.',
    'trip.detail.datesUnavailable': 'Fechas no disponibles',
    'trip.detail.memoryFrom': 'Recuerdo de {location}',
    'trip.detail.tripMemory': 'Recuerdo del viaje {number}',
    'trip.detail.unknownLocation': 'Destino desconocido',
    'trip.detail.noForecast': 'Sin previsión',
    'trip.detail.datePending': 'Fecha pendiente',
    'trip.detail.unableLoad': 'No se puede cargar este viaje.',
    'trip.detail.deleteConfirm': '¿Seguro que quieres eliminar este viaje?',
    'trip.detail.unableDelete': 'No se puede eliminar este viaje ahora mismo.',
    'trip.detail.loading': 'Cargando detalles del viaje...',
    'trip.detail.eyebrow': 'Detalle del viaje',
    'trip.detail.noDescription': 'No se proporcionó descripción.',
    'trip.detail.edit': 'Editar viaje',
    'trip.detail.deleting': 'Eliminando...',
    'trip.detail.delete': 'Eliminar viaje',
    'trip.detail.noParticipants': 'No hay participantes disponibles.',
    'trip.detail.route': 'Ruta',
    'trip.detail.tripRoute': 'Ruta del viaje',
    'trip.detail.stops': 'Paradas',
    'trip.detail.locationsVisited': 'Destinos visitados',
    'trip.detail.stopDescription': 'Parada {current} de la ruta con coordenadas guardadas para el itinerario familiar.',
    'trip.detail.noLocations': 'No hay destinos guardados para este viaje.',
    'trip.detail.forecast': 'Previsión',
    'trip.detail.weatherOverview': 'Resumen del clima',
    'trip.detail.noWeather': 'No hay datos de clima disponibles.',
    'trip.detail.memories': 'Recuerdos',
    'trip.detail.photoGallery': 'Galería de fotos',
    'trip.detail.noPhotos': 'No se han subido fotos para este viaje.',
    'photo.tripPhotos': 'Fotos del viaje',
    'photo.remove': 'Eliminar',
    'map.selectedLocation': 'Destino seleccionado',
  },
}

const getSavedTheme = () => {
  if (!isBrowser) return 'light'

  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)

  if (supportedThemes.includes(savedTheme)) {
    return savedTheme
  }

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const getSavedLocale = () => {
  if (!isBrowser) return 'en'

  const savedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY)

  return supportedLocales.includes(savedLocale) ? savedLocale : 'en'
}

const theme = ref(getSavedTheme())
const locale = ref(getSavedLocale())

const applyTheme = (nextTheme) => {
  if (!isBrowser) return

  document.documentElement.dataset.theme = nextTheme
  document.documentElement.classList.toggle('dark', nextTheme === 'dark')
  document.documentElement.style.colorScheme = nextTheme
}

const applyLocale = (nextLocale) => {
  if (!isBrowser) return

  document.documentElement.lang = nextLocale
}

applyTheme(theme.value)
applyLocale(locale.value)

watch(theme, (nextTheme) => {
  applyTheme(nextTheme)

  if (isBrowser) {
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
  }
})

watch(locale, (nextLocale) => {
  applyLocale(nextLocale)

  if (isBrowser) {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale)
  }
})

const interpolate = (message, params = {}) =>
  Object.entries(params).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, value),
    message,
  )

export const usePreferences = () => {
  const isDarkTheme = computed(() => theme.value === 'dark')
  const themeLabel = computed(() =>
    isDarkTheme.value ? messages[locale.value]['theme.dark'] : messages[locale.value]['theme.light'],
  )
  const nextThemeLabel = computed(() =>
    isDarkTheme.value ? messages[locale.value]['theme.toggleToLight'] : messages[locale.value]['theme.toggleToDark'],
  )

  const setTheme = (nextTheme) => {
    if (supportedThemes.includes(nextTheme)) {
      theme.value = nextTheme
    }
  }

  const toggleTheme = () => {
    theme.value = isDarkTheme.value ? 'light' : 'dark'
  }

  const setLocale = (nextLocale) => {
    if (supportedLocales.includes(nextLocale)) {
      locale.value = nextLocale
    }
  }

  const t = (key, params) => interpolate(messages[locale.value]?.[key] || messages.en[key] || key, params)

  return {
    isDarkTheme,
    locale,
    setLocale,
    setTheme,
    supportedLocales,
    t,
    theme,
    themeLabel,
    nextThemeLabel,
    toggleTheme,
  }
}
