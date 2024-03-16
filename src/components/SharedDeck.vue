<template>
    <div>
        <h1>Deck Information</h1>
        <p v-if="loading">Loading...</p>
        <p v-else>{{ deckName }}</p>
    </div>
</template>

<script>
import db from '@/firebaseInit';
import { doc, getDoc } from 'firebase/firestore';
// import { onMounted, ref } from 'vue';

export default {
    name: 'SharedDeck',
    data() {
        return {
            deckName: '',
            loading: true
        };
    },
    async beforeMount() {
        this.loading = true;
        const deckId = this.$route.params.globalDeckId;
        const docRef = doc(db, 'shared-decks', deckId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            this.deckName = docSnap.data().name;
        } else {
            this.deckName = 'Deck not found';
        }
        this.loading = false;
    }
};

</script>