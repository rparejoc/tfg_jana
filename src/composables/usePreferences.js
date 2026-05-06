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
    'photo.tripPhotos': 'Trip photos',
    'photo.remove': 'Remove',
  },
  es: {
    'nav.dashboard': 'Panel',
    'nav.family': 'Familia',
    'nav.logout': 'Cerrar sesión',
    'nav.noEmail': 'Sin email',
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
    'photo.tripPhotos': 'Fotos del viaje',
    'photo.remove': 'Eliminar',
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
