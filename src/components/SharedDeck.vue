<template>
    <div>
        <h1>Deck Information</h1>
        <p v-if="loading">Loading...</p>
        <p v-else-if="errorMessage">{{ errorMessage }}</p>
        <div v-else>
            <p>Name: {{ sharedDeckInfo.name }}</p>
            <p>Cards: {{ sharedDeckInfo.cardsCount }}</p>
            <p>AuthorName: {{ sharedDeckInfo.author.name }}</p>
            <p>showName: {{ sharedDeckInfo.author.showName }}</p>
        </div>
    </div>
</template>

<script>
import db from '@/firebaseInit';
import { doc, getDoc } from 'firebase/firestore';

export default {
    name: 'SharedDeck',
    data() {
        return {
            sharedDeckInfo: null,
            loading: true,
            errorMessage: ''
        };
    },
    async beforeMount() {
        this.loading = true;
        const deckId = this.$route.params.globalDeckId;
        const globalRef = doc(db, 'shared-decks', deckId);
        try {
            const globalSnap = await getDoc(globalRef);
            if (globalSnap.exists()) {
                const globalDeckInfo = globalSnap.data();
                const deckRef = doc(db, `users/${globalDeckInfo.userId}/sharedDecks/${globalDeckInfo.deckId}`);
                const deckSnap = await getDoc(deckRef);
                if (deckSnap.exists()) {
                    this.sharedDeckInfo = deckSnap.data();
                } else {
                    this.errorMessage = 'Deck not found 2';
                } 
            } else {
                this.errorMessage = 'Deck not found';
            }
        }
        catch(error) {
            console.error("Failed to fetch document:", error);
            this.errorMessage = 'Failed to load deck information'; // Set error message on exception
        } finally {
            this.loading = false;
        }
    }
};

</script>