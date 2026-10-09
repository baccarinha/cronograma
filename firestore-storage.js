import { db } from "./firebase-config.js";
import {
    collection,
    doc,
    getDocs,
    onSnapshot,
    serverTimestamp,
    writeBatch
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const DATA_COLLECTIONS = ["funcionarios", "cronogramas", "setores"];

function userCollection(uid, name) {
    return collection(db, "usuarios", uid, name);
}

function getItems(snapshot) {
    if (!snapshot.exists()) return null;
    const value = snapshot.data().items;
    return Array.isArray(value) ? value : [];
}

export async function loadUserData(uid) {
    const entries = await Promise.all(DATA_COLLECTIONS.map(async name => {
        const snapshot = await getDocs(userCollection(uid, name));
        const documents = snapshot.docs;
        return [name, documents.length ? documents[0].data().items : null];
    }));
    const data = Object.fromEntries(entries);
    return {
        exists: DATA_COLLECTIONS.some(name => data[name] !== null),
        employees: data.funcionarios,
        schedules: data.cronogramas,
        sectors: data.setores
    };
}

export async function saveUserData(uid, state) {
    const revision = crypto.randomUUID();
    const batch = writeBatch(db);
    const values = {
        funcionarios: state.employees,
        cronogramas: state.schedules,
        setores: state.sectors
    };

    for (const name of DATA_COLLECTIONS) {
        const target = doc(userCollection(uid, name), "principal");
        batch.set(target, {
            items: values[name],
            revision,
            updatedAt: serverTimestamp()
        });
    }

    await batch.commit();
}

export function subscribeUserData(uid, onData, onError) {
    const latest = Object.create(null);
    const received = new Set();
    const unsubscribeFunctions = DATA_COLLECTIONS.map(name => onSnapshot(
        doc(userCollection(uid, name), "principal"),
        snapshot => {
            const data = getItems(snapshot);
            latest[name] = {
                items: data,
                revision: snapshot.exists() ? (snapshot.data().revision || null) : null
            };
            received.add(name);
            if (received.size !== DATA_COLLECTIONS.length) return;

            const revisions = DATA_COLLECTIONS.map(key => latest[key].revision);
            if (revisions.some(revision => revision !== revisions[0])) return;

            onData({
                employees: latest.funcionarios.items || [],
                schedules: latest.cronogramas.items || [],
                sectors: latest.setores.items || null
            });
        },
        onError
    ));

    return () => unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
}
