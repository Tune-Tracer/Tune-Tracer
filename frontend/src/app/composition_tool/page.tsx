'use client' // IMPORTANT as Vexflow only renders in the DOM

import React, { useEffect, useRef, useState } from 'react';
import { Score } from '../edit/Score';
import {
    AppShell, 
    Container, 
    Text,
    Button,
    Group,
    Space,
    Stack,
    SimpleGrid,
    Grid,
    Flex,
    Input,
    TextInput,
} from "@mantine/core";


const ToolbarHeader: React.FC = () => {
    return (
      <AppShell.Header height={120} p="md" sx={{ display: 'flex', flexDirection: 'column' }}>
        {/* First layer (top section) */}
        <Group align="center" style={{ borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
            <Text size="xl" component="a" href="/storage">Tune Tracer</Text>
            <TextInput 
                size="md"
                placeholder="Enter Document Name"
                // value={}
                // onChange={}
            />
            <Button>Share</Button>
        </Group>
  
        {/* Second layer (middle section) */}
        <Group align="center" mt="md" style={{ borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
            <Group>
                <Button variant="outline">Home</Button>
                <Button variant="outline">About</Button>
                <Button variant="outline">Services</Button>
                <Button variant="outline">Contact</Button>
            </Group>
            <Input placeholder="Search..." />
        </Group>
  
        {/* Third layer (bottom section) */}
        <Flex justify="flex-end" align="center" mt="md">
            <Text>Support: +123-456-789</Text>
        </Flex>
      </AppShell.Header>
    );
  };


const DEFAULT_RENDERER_WIDTH = 1000;
const DEFAULT_RENDERER_HEIGHT = 2000;

export default function CompositionTool() {
    const notationRef = useRef<HTMLDivElement>(null);
    const score = useRef<Score | null>(null);

    useEffect(() => {
        const clearSVG = () => {
            if (notationRef.current) {
                notationRef.current.innerHTML = '';
            }
        };

        const renderNotation = () => {
            if (notationRef.current) {
                score.current = new Score(
                    notationRef.current,
                    DEFAULT_RENDERER_HEIGHT,
                    DEFAULT_RENDERER_WIDTH
                );
            }
        };

        clearSVG();
        renderNotation();
    }, []);

    return (
        <AppShell
            header={{ height: 120 }}
            navbar={{
                width: 250,
                breakpoint: "sm",
            }}
            padding="md"
        >
            <AppShell.Main>
                <ToolbarHeader />
                    
                    {/* Somehow adding the NavBar removes the score and its container */}
                {/* <AppShell.Navbar>

                </AppShell.Navbar> */}

                
                    {/* get rid of the background later, use it for formatting */}
                <Container
                    fluid
                    size="responsive"
                    style={{
                        justifyContent: "center",
                        display: "flex",
                        flexDirection: "column",
                        textAlign: "center",
                        background:
                        "linear-gradient(180deg, rgba(154,215,255,1) 0%, rgba(0,105,182,1) 100%)",
                    }}
                >
                    <Space h="xl"></Space>
                    <Text>Score Name</Text>

                    <div>
                        <div ref={notationRef}></div>
                    </div>
                </Container>


                    
            </AppShell.Main>
        </AppShell>
    );
};
