type FilterDefaultsPage = "students" | "applications";

type PostLoginFilterDefaultsState = Partial<Record<FilterDefaultsPage, boolean>>;

const postLoginFilterDefaultsStorageKey =
  "horizon-admin.postLoginFilterDefaults.v1";

const readPostLoginFilterDefaultsState = (): PostLoginFilterDefaultsState => {
  try {
    const rawValue = window.sessionStorage.getItem(
      postLoginFilterDefaultsStorageKey
    );

    if (!rawValue) {
      return {};
    }

    const value = JSON.parse(rawValue) as PostLoginFilterDefaultsState;

    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
};

const writePostLoginFilterDefaultsState = (
  state: PostLoginFilterDefaultsState
): void => {
  try {
    const hasPendingPage = Object.values(state).some(Boolean);

    if (!hasPendingPage) {
      window.sessionStorage.removeItem(postLoginFilterDefaultsStorageKey);
      return;
    }

    window.sessionStorage.setItem(
      postLoginFilterDefaultsStorageKey,
      JSON.stringify(state)
    );
  } catch {
    // Ignore storage failures and keep the normal localStorage behavior.
  }
};

export const markPostLoginFilterDefaultsPending = (): void => {
  writePostLoginFilterDefaultsState({
    students: true,
    applications: true
  });
};

export const consumePostLoginFilterDefaults = (
  page: FilterDefaultsPage
): boolean => {
  const state = readPostLoginFilterDefaultsState();

  if (!state[page]) {
    return false;
  }

  writePostLoginFilterDefaultsState({
    ...state,
    [page]: false
  });

  return true;
};
