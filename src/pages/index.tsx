import GroupCard from "@/components/GroupCard";
import { useLights } from "@/lib/hooks/useLights";
import { Box, Button, Container, Flex, Spinner } from "@chakra-ui/react";
import { mdiLightbulbGroup, mdiLightbulbGroupOff } from "@mdi/js";
import Icon from "@mdi/react";
import { Nunito } from "next/font/google";
import Head from "next/head";

const nunito = Nunito({ subsets: ["latin"] });

export default function Home() {
    const {
        groups,
        isLoading,
        changeBulbLights,
        changeGroupLights,
        switchAll,
        renameGroup,
        renameBulb
    } = useLights();

    return (
        <>
            <Head>
                <title>Valo App</title>
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1"
                />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <main className={`${nunito.className}`}>
                <Container size="2xl">
                    {isLoading && (
                        <Flex
                            alignItems="center"
                            justifyContent="center"
                            gap={2}
                            w="100%"
                            p={5}>
                            <Spinner />
                            <span>Loading...</span>
                        </Flex>
                    )}
                    {!isLoading && groups.length === 0 && (
                        <Box color="gray.500">No groups</Box>
                    )}
                    {!isLoading && groups.length > 0 && (
                        <>
                            <Flex
                                p={5}
                                alignItems="center"
                                justifyContent="center"
                                gap={4}>
                                <Button
                                    size="lg"
                                    rightIcon={
                                        <Icon
                                            path={mdiLightbulbGroup}
                                            size={1}
                                        />
                                    }
                                    onClick={() => switchAll(true)}>
                                    All on
                                </Button>
                                <Button
                                    size="lg"
                                    rightIcon={
                                        <Icon
                                            path={mdiLightbulbGroupOff}
                                            size={1}
                                        />
                                    }
                                    onClick={() => switchAll(false)}>
                                    All off
                                </Button>
                            </Flex>
                            <Flex
                                direction={["column", "column", "row"]}
                                gap={5}
                                pb={8}>
                                {groups.map((group) => (
                                    <GroupCard
                                        key={group.id}
                                        group={group}
                                        onGroupLightChange={(state) =>
                                            changeGroupLights(group.id, state)
                                        }
                                        onBulbLightChange={(bulb, state) =>
                                            changeBulbLights(bulb.id, state)
                                        }
                                        onGroupNameChange={(name) =>
                                            renameGroup(group.id, name)
                                        }
                                        onBulbNameChange={(bulb, name) =>
                                            renameBulb(bulb.id, name)
                                        }
                                    />
                                ))}
                            </Flex>
                        </>
                    )}
                </Container>
            </main>
        </>
    );
}
