const PHASE_STORAGE_KEY =
    "forge_phase_data";


export function getPhaseData() {

    const stored =
        localStorage.getItem(
            PHASE_STORAGE_KEY
        );


    if (!stored) {

        return {
            currentPhase: null,
            history: []
        };

    }


    try {

        const data =
            JSON.parse(stored);


        return {
            currentPhase:
                data.currentPhase || null,

            history:
                Array.isArray(data.history)
                    ? data.history
                    : []
        };

    }

    catch {

        return {
            currentPhase: null,
            history: []
        };

    }

}


function savePhaseData(data) {

    localStorage.setItem(
        PHASE_STORAGE_KEY,
        JSON.stringify(data)
    );

}


export function startPhase({
    type,
    startDate,
    startWeight = null,
    targetWeight = null,
    targetRate = null
}) {

    const data =
        getPhaseData();


    if (data.currentPhase) {

        throw new Error(
            "End the current phase before starting another."
        );

    }


    data.currentPhase = {

        id:
            Date.now(),

        type,

        startDate,

        startWeight,

        targetWeight,

        targetRate

    };


    savePhaseData(data);


    return data.currentPhase;

}


export function endCurrentPhase({
    endDate,
    endWeight = null
}) {

    const data =
        getPhaseData();


    if (!data.currentPhase) {
        return null;
    }


    const finishedPhase = {

        ...data.currentPhase,

        endDate,

        endWeight

    };


    data.history.push(
        finishedPhase
    );


    data.currentPhase =
        null;


    savePhaseData(data);


    return finishedPhase;

}


export function getCurrentPhase() {

    return (
        getPhaseData()
            .currentPhase
    );

}


export function getPhaseHistory() {

    return (
        getPhaseData()
            .history
    );

}


export function getPhaseForDate(date) {

    const data =
        getPhaseData();


    if (
        data.currentPhase &&
        date >=
            data.currentPhase.startDate
    ) {

        return data.currentPhase;

    }


    const match =
        [...data.history]
            .reverse()
            .find(
                phase => {

                    return (
                        date >=
                            phase.startDate &&
                        date <=
                            phase.endDate
                    );

                }
            );


    return match || null;

}