import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { c } from 'ttag';
import { useNotifications, useUser, useUserKeys, useApi, FormModal } from 'react-components';

import ImportFooter from './ImportFooter';
import AttachingModalContent from './AttachingModalContent';
import ImportCsvModalContent from './ImportCsvModalContent';
import ImportingModalContent from './ImportingModalContent';

import { noop } from 'proton-shared/lib/helpers/function';
import { addContacts } from 'proton-shared/lib/api/contacts';
import { readFileAsString } from 'proton-shared/lib/helpers/file';
import { extractVcards, parse as parseVcard } from '../../helpers/vcard';
import { prepareVcard } from '../../helpers/decrypt';
import { IMPORT_STEPS } from '../../constants';

const { ATTACHING, ATTACHED, CHECKING_CSV, IMPORTING } = IMPORT_STEPS;

const getI18nTitle = {
    [ATTACHING]: c('Title').t`Import contacts`,
    [ATTACHED]: c('Title').t`Import contacts`,
    [CHECKING_CSV]: c('Title').t`Import CSV file`,
    [IMPORTING]: c('Title').t`Importing contacts`
};

const ImportModal = ({ onClose, ...rest }) => {
    const api = useApi();
    const [user] = useUser();
    const [userKeysList, loadingUserKeys] = useUserKeys(user);
    const { createNotification } = useNotifications();

    const [step, setStep] = useState(ATTACHING);
    const [importFile, setImportFile] = useState(null);
    const [parsedContacts, setParsedContacts] = useState([]);
    const [propertiesToKeep, setPropertiesToKeep] = useState([]);

    const [totalContacts, setTotalContacts] = useState(0);
    const [contactsImported, addSuccess] = useState([]);
    const [contactsNotImported, addError] = useState([]);

    const handleAttach = async ({ target }) => {
        // TODO: set some limit on the total number of files or their size ?
        const file = [...target.files].filter(({ type }) => ['text/vcard', 'text/csv'].includes(type))[0];

        if (target.files.length && !file) {
            return createNotification({
                type: 'error',
                text: c('Error notification').t`No .csv or .vcard file selected`
            });
        }
        setStep(ATTACHED);
        setImportFile(file);
    };

    const handleClear = () => {
        setImportFile(null);
        setStep(ATTACHING);
    };

    const handleChangeParsedContacts = (parsedContacts) => setParsedContacts(parsedContacts);
    const handleChangePropertiesToKeep = (propertiesToKeep) => setPropertiesToKeep(propertiesToKeep);
    const handleToggleKeepProperty = (index) => {
        setPropertiesToKeep((propertiesToKeep) => propertiesToKeep.map((bool, j) => (index === j ? !bool : bool)));
    };

    const handleSubmit = {
        [ATTACHING]: noop,
        [ATTACHED]: () => setStep(importFile.type === 'text/csv' ? CHECKING_CSV : IMPORTING),
        [CHECKING_CSV]: () => {
            setParsedContacts(
                parsedContacts.map((properties) => properties.filter((property, i) => propertiesToKeep[i]))
            );
            setStep(IMPORTING);
        },
        [IMPORTING]: onClose
    };

    console.log('step', step);

    useEffect(() => {
        // const setup = async () => {
        //     // read files, count contacts and extract their vcard properties
        //     const contactsProperties = [];
        //     for (const file of importFiles) {
        //         if (file.type == 'text/vcard') {
        //             const vcards = extractVcards(await readFileAsString(file));
        //             setTotalContacts((totalContacts) => totalContacts + vcards.length);
        //             vcards.forEach((vcard) => contactsProperties.push(parseVcard(vcard)));
        //         }
        //         if (file.type == 'text/csv') {
        //             const { values: contactValues } = extractCsvContacts(file);
        //             setTotalContacts((totalContacts) => totalContacts + contactValues.length);
        //             contactsProperties.concat(parseCsvContacts(contactValues));
        //         }
        //     }
        //     // encrypt contacts
        //     for (const vcard of vcards) {
        //         try {
        //             const contactImported = prepareVcard(vcard, userKeysList);
        //             addSuccess((contactsImported) => [...contactsImported, contactImported]);
        //         } catch (error) {
        //             addError((contactsNotImported) => [...contactsNotImported, vcard]);
        //         }
        //     }
        //     // send contacts to back-end
        //     await api(addContacts(contactsImported));
        // };
        // step === IMPORTING && setup();
    }, [step === IMPORTING]);

    return (
        <FormModal
            title={getI18nTitle[step]}
            onSubmit={handleSubmit[step]}
            onClose={onClose}
            footer={ImportFooter({ step })}
            {...rest}
        >
            {step <= ATTACHED ? (
                <AttachingModalContent
                    attached={step === ATTACHED}
                    file={importFile}
                    onAttach={handleAttach}
                    onClear={handleClear}
                />
            ) : step === CHECKING_CSV ? (
                <ImportCsvModalContent
                    file={importFile}
                    parsedContacts={parsedContacts}
                    propertiesToKeep={propertiesToKeep}
                    onChangeParsedContacts={handleChangeParsedContacts}
                    onChangePropertiesToKeep={handleChangePropertiesToKeep}
                    onToggleKeepProperty={handleToggleKeepProperty}
                />
            ) : (
                <ImportingModalContent
                    parsedContacts={parsedContacts}
                    imported={contactsImported.length}
                    notImported={contactsNotImported.length}
                    total={totalContacts}
                />
            )}
        </FormModal>
    );
};

ImportModal.propTypes = {
    onClose: PropTypes.func
};

export default ImportModal;
