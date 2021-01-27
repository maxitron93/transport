const chart_width = 500
const chart_height = 470
const trend_chart_padding_bottom = 25
const trend_chart_padding_top = 70
const trend_chart_padding_left = 70
const trend_chart_padding_right = 100
const trend_chart_up_shift = -17
const bay_geojson = d3.json('bay.geojson')
const tram_geojson = d3.json('tram_geojson.geojson')
const train_geojson = d3.json('train_geojson.geojson')
const tram_route_data = JSON.parse(tram_route_data_json)
const tram_route_to_geo_ids = JSON.parse(tram_route_to_geo_ids_json)
const geo_id_to_tram_routes = JSON.parse(geo_id_to_tram_routes_json)
const tram_trend_data = JSON.parse(tram_trend_data_json)
const train_route_data = JSON.parse(train_route_data_json)
const train_route_to_geo_ids = JSON.parse(train_route_to_geo_ids_json)
const geo_id_to_train_routes = JSON.parse(geo_id_to_train_routes_json)
const train_trend_data = JSON.parse(train_trend_data_json)
// Tram Projection
let projection_tram = d3.geoMercator()
    .center([0,-37.795]) // Center latitude 
    .rotate([-145.025,0])  // Center longitude
    .translate([chart_width / 2, chart_height / 2])
    .scale([80000])
let path_tram = d3.geoPath(projection_tram)

let tram_svg = d3.select('#network_tram')
    .append('svg')
    .attr('width', chart_width)
    .attr('height', chart_height)
    // .style('background-color', 'darkslateblue')
    .style('background-color', 'rgb(30,30,30)')

bay_geojson.then(function(data){
    tram_svg.selectAll('path')
        .data(data.features)
        .enter()
        .append('path')
        .attr('d', path_tram)
        // .attr('fill', 'rgb(3, 3, 50)')
        .attr('fill', 'rgb(15,15,15)')
    })
// Train Projection
let projection_train = d3.geoMercator()
    .center([0,-37.86]) // Center latitude 
    .rotate([-145.07,0])  // Center longitude 
    .translate([chart_width / 2, chart_height / 2])
    .scale([34300])
let path_train = d3.geoPath(projection_train)

let train_svg = d3.select('#network_train')
    .append('svg')
    .attr('width', chart_width)
    .attr('height', chart_height)
    // .style('background-color', 'darkslateblue')
    .style('background-color', 'rgb(30,30,30)')

bay_geojson.then(function(data){
    train_svg.selectAll('path')
        .data(data.features)
        .enter()
        .append('path')
        .attr('d', path_train)
        // .attr('fill', 'rgb(3, 3, 50)')
        .attr('fill', 'rgb(15,15,15)')
    })
// Trend Chart
let trend_svg = d3.select('#trend_viz')
    .append('svg')
    .attr('width', chart_width * 2)
    .attr('height', chart_height)

let time_format = d3.timeFormat('%Y')
let time_parse = d3.timeParse('%Y')

let x_scale = d3.scaleTime()
    .domain([time_parse(2001), time_parse(2019)])
    .range([trend_chart_padding_left, chart_width * 2 - trend_chart_padding_right])

let x_axis = d3.axisBottom(x_scale)
    .ticks(19)
    .tickFormat(time_format)

trend_svg.append('g')
    .attr('transform', 'translate(0,' + (chart_height - trend_chart_padding_bottom) + ')')
    .attr('class', 'x_axis')
    .call(x_axis)


// DATA CONTROLLER
let dataController = (function() {
    const app_state = {
        metric: 'rel', // rel, punc, serv
        viz: 'network', // network, trend
        routes: {
            tram: [],
            train: []
        }
    }

    const tramNetwork = {
        name: 'tram',
        geojson: tram_geojson,
        svg: tram_svg,
        path: path_tram,
        routes: geo_id_to_tram_routes,
        lines: tram_route_to_geo_ids,
        routeData: tram_route_data
    }

    const trainNetwork = {
        name: 'train',
        geojson: train_geojson,
        svg: train_svg,
        path: path_train,
        routes: geo_id_to_train_routes,
        lines: train_route_to_geo_ids,
        routeData: train_route_data
    }

    return {
        app_state: app_state,
        tramNetwork: tramNetwork,
        trainNetwork: trainNetwork
    }
})()

// UI CONTROLLER
let UIController = (function() {

    // Render Metric Selector Buttons
    let render_metric_buttons = (state) => {
        document.querySelectorAll('.metric_selector').forEach((button) => {
            if (button.id == state['metric']) {
                button.classList.add('active')
            } else {
                button.classList.remove('active')
            }
        })
    }

    // Render Viz Selector Buttons
    let render_viz_buttons = (state) => {
        document.querySelectorAll('.viz_selector').forEach((button) => {
            if (button.id == state['viz']) {
                button.classList.add('active')
            } else {
                button.classList.remove('active')
            }
        })
    }

    // Render Tram Route Selector Buttoms
    let render_tram_route_selector_buttons = (state) => {
        document.querySelectorAll('.tram_route_button').forEach((button) => {
            if (state['routes']['tram'].includes(button.innerHTML)) {
                button.classList.add('active')
            } else {
                button.classList.remove('active')
            }
        })
    }

    // Render Train Route Selector Buttoms
    let render_train_route_selector_buttons = (state) => {
        document.querySelectorAll('.train_route_button').forEach((button) => {
            if (state['routes']['train'].includes(button.innerHTML)) {
                button.classList.add('active')
            } else {
                button.classList.remove('active')
            }
        })
    }

    // Render selected viz
    let render_selected_viz = (state) => {
        if (state['viz'] == 'network') {
            document.getElementById('trend_viz').style.display = 'none'
            document.getElementById('network_tram').style.display = 'block'
            document.getElementById('network_train').style.display = 'block'
        } else {
            document.getElementById('network_tram').style.display = 'none'
            document.getElementById('network_train').style.display = 'none'
            document.getElementById('trend_viz').style.display = 'block'
        }
    }

    // Calculate Metric (helper Function for render_network_lines function)
    let calculate_metric = (line_id, state, networkType) => {
        let routes = networkType['routes'][line_id]
        let total_measured = 0
        let total_base = 0
        routes.forEach((route) => {
            if (state['metric'] == 'rel' || state['metric'] == 'punc') {
                if (state['metric'] == 'rel') {
                    total_measured += networkType['routeData'][route]['delivered']
                    total_base += networkType['routeData'][route]['scheduled']
                } else if (state['metric'] == 'punc') {
                    total_measured += networkType['routeData'][route]['on_time']
                    total_base += networkType['routeData'][route]['arrived']
                }
            } else {
                let routes = networkType['routes'][line_id]
                routes.forEach((route) => {
                    total_base += networkType['routeData'][route]['2001_delivered']
                    total_measured += networkType['routeData'][route]['delivered']
                })
            }
        })
        let calculated_metric = total_measured / total_base
        return calculated_metric
    }

    // Render Tram or Train Lines
    let render_network_lines = (networkType, state) => {
        networkType['geojson'].then(function(data){
            networkType['svg'].selectAll('path')
            .data(data.features)
            .enter()
            .append('path')
            .attr('class', 'network_line')
            .attr('d', networkType['path'])
            // Stroke color; depends on metric selected
            .attr('stroke', (d) => {
                if (state['metric'] == 'rel') {
                    return 'orange'
                } else if (state['metric'] == 'punc') {
                    return 'darkturquoise'
                } else {
                    let line_id = parseInt(d.properties.ID)
                    let increase = calculate_metric(line_id, state, networkType)
                    if (increase > 1) {
                        if (increase <= 1.2) {
                            return `rgba(76,175,43,0.4)`
                        } 
                        else if (increase <= 1.4) {
                            return `rgba(76,175,43,0.6)`
                        }
                        else if (increase <= 1.6) {
                            return `rgba(76,175,43,0.8)`
                        }
                        else {
                            return `rgba(76,175,43,1)`
                        }
                    } else {
                        if (increase >= 0.9) {
                            return `rgba(160,13,13,0.4)`
                        } 
                        else if (increase >= 0.8) {
                            return `rgba(160,13,13,0.6)`
                        }
                        else if (increase >= 0.7) {
                            return `rgba(160,13,13,0.8)`
                        }
                        else {
                            return `rgba(160,13,13,1)`
                        }
                    }
                }
            })
            // Opacity; depends on metric and routes selected
            .style('stroke-opacity', (d) => {
                let line_id = parseInt(d.properties.ID)
                if (state['metric'] == 'rel' || state['metric'] == 'punc') {
                    let calculated_metric = calculate_metric(line_id, state, networkType)
                    let multiplier = 0
                    if (state['metric'] == 'rel') {
                        multiplier = 30
                    } else if (state['metric'] == 'punc') {
                        multiplier = 3
                    }
                    let transparency = (1 - calculated_metric) * multiplier
                    if (state['routes'][networkType['name']].length == 0) {
                        return 1 - transparency
                    } else {
                        let return_value = 0.08
                        state['routes'][networkType['name']].forEach((route_id) => {
                            if (networkType['lines'][route_id].includes(line_id)) {
                                return_value = 1 - transparency
                            }
                        }) 
                        return return_value
                    }
                } else {
                    if (state['routes'][networkType['name']].length == 0) {
                        return 1
                    } else {
                        let return_value = 0.08
                        state['routes'][networkType['name']].forEach((route_id) => {
                            if (networkType['lines'][route_id].includes(line_id)) {
                                return_value = 1
                            }
                        }) 
                        return return_value
                    }
                }
            })
            .attr('stroke-width', 3)
            .attr('fill', 'none')
            .on('mouseover', (d) => {
                // Calculate metric
                let line_id = parseInt(d.properties.ID)
                let calculated_metric = calculate_metric(line_id, state, networkType)
                let calculated_metric_formatted
                if (state['metric'] == 'rel' || state['metric'] == 'punc') {
                    calculated_metric_formatted = (Math.round(calculated_metric * 1000) / 10) + '%'
                } else {
                    if (calculated_metric >= 1) {
                        calculated_metric_formatted = '+' + (Math.round((calculated_metric - 1) * 1000) / 10) + '%'
                    } else {
                        calculated_metric_formatted = (Math.round((calculated_metric - 1) * 1000) / 10) + '%'
                    }
                }
                // Get mouse position and show tooltip
                tooltip_element = document.getElementById('tooltip')
                tooltip_element.innerHTML = calculated_metric_formatted
                tooltip_element.style.display = 'block'
                window.onmousemove = (e) => {
                    let x = e.clientX
                    let y = e.clientY
                    tooltip_element.style.top = (y - 32) + 'px'
                    tooltip_element.style.left = (x - 30) + 'px'
                }
            })
            .on('mouseout', (d) => {
                tooltip_element = document.getElementById('tooltip')
                tooltip_element.style.display = 'none'
            })
        })
    }
    
    // Clear Tram or Train Lines
    let clear_network_lines = (networkType) => {
        networkType['svg'].selectAll('.network_line').remove()
    }

    // Render Trend Viz
    let render_trend_viz = (state) => {
        // Set universal variables
        let percent_format
        let tick_count
        let y_scale = d3.scaleLinear()
        // Set scale (based on metric selected)
        if (state['metric'] == 'rel') {
            percent_format = d3.format('.01%')
            tick_count = 7
            y_scale
            .domain([0.97,1])
            .range([chart_height - trend_chart_padding_bottom, trend_chart_padding_top])
        } else if (state['metric'] == 'punc') {
            percent_format = d3.format('.0%')
            tick_count = 9
            y_scale
            .domain([0.6,1])
            .range([chart_height - trend_chart_padding_bottom, trend_chart_padding_top])
        } else {
            percent_format = d3.format('.0%')
            tick_count = 15
            y_scale
            .domain([-0.4,1])
            .range([chart_height - trend_chart_padding_bottom, trend_chart_padding_top])
        }
        // Draw y-axis
        let y_axis = d3.axisLeft(y_scale)
            .ticks(tick_count)
            .tickFormat(percent_format)
        trend_svg.append('g')
            .attr('transform', 'translate(' + trend_chart_padding_left + ', ' + trend_chart_up_shift + ')')
            .attr('class', 'y_axis')
            .call(y_axis)
        d3.selectAll('.y_axis line')
            .attr('x2', chart_width * 2 - 150)
        // Create tred_line for drawing lines
        let trend_line = d3.line()
            .x((d) => {
                return x_scale(time_parse(d['year']))
            })
            .y((d) => {
                return y_scale(d['metrics'][state['metric']]) + trend_chart_up_shift
            })
        // Render Tram network
        let text_y_tram = tram_trend_data['whole_network'][tram_trend_data['whole_network'].length - 1]['metrics'][state['metric']]
        let color_tram_network = 'orange'
        trend_svg.append('path')
            .datum(tram_trend_data['whole_network'])
            .attr('d', trend_line)
            .attr('stroke', color_tram_network)
            .attr('stroke-width', 2.7)
            .attr('fill', 'none')
        trend_svg.append('text')
            .text('Tram Network')
            .attr('class', 'legend_text')
            .attr('x', x_scale(time_parse(2019)) + 10)
            .attr('y', y_scale(text_y_tram) + trend_chart_up_shift + 4)
            .attr('fill', color_tram_network)
        // Render Train network
        let text_y_train = train_trend_data['whole_network'][train_trend_data['whole_network'].length - 1]['metrics'][state['metric']]
        // let color_train_network = 'darkturquoise'
        let color_train_network = '#007b7d'
        trend_svg.append('path')
            .datum(train_trend_data['whole_network'])
            .attr('d', trend_line)
            .attr('stroke', color_train_network)
            .attr('stroke-width', 2.7)
            .attr('fill', 'none')
        trend_svg.append('text')
            .text('Train Network')
            .attr('class', 'legend_text')
            .attr('x', x_scale(time_parse(2019)) + 10)
            .attr('y', y_scale(text_y_train) + trend_chart_up_shift + 4)
            .attr('fill', color_train_network)
        // Render selected tram routes
        state['routes']['tram'].forEach((route) => {
            let text_y = tram_trend_data[route][tram_trend_data[route].length - 1]['metrics'][state['metric']]
            trend_svg.append('path')
                .datum(tram_trend_data[route])
                .attr('d', trend_line)
                .attr('stroke', 'gold')
                .attr('stroke-width', 2.7)
                .attr('fill', 'none')
            trend_svg.append('text')
                .text(route)
                .attr('class', 'legend_text')
                .attr('x', x_scale(time_parse(2019)) + 10)
                .attr('y', y_scale(text_y) + trend_chart_up_shift + 4)
                .attr('fill', 'gold')
        })
        // Render selected train routes
        state['routes']['train'].forEach((route) => {
            let text_y = train_trend_data[route][train_trend_data[route].length - 1]['metrics'][state['metric']]
            trend_svg.append('path')
                .datum(train_trend_data[route])
                .attr('d', trend_line)
                .attr('stroke', 'turquoise')
                .attr('stroke-width', 2.7)
                .attr('fill', 'none')
            trend_svg.append('text')
                .text(route)
                .attr('class', 'legend_text')
                .attr('x', x_scale(time_parse(2019)) + 10)
                .attr('y', y_scale(text_y) + trend_chart_up_shift + 4)
                .attr('fill', 'turquoise')
        })    
    }

    // Clear Trend Viz
    let clear_trend_viz = () => {
        trend_svg.selectAll('path').remove()
        trend_svg.selectAll('.y_axis').remove()
        trend_svg.selectAll('.legend_text').remove()
    }

    // Render Legend
    let render_legend = (state) => {
        let legend_container = document.getElementById('legend')
        if (state['viz'] == 'network') {
            legend_container.style.display = 'block'
            if (state['metric'] == 'rel') {
                legend_container.innerHTML = `
                The Reliability of services on both networks range from 
                <span class="legend_number" id="legend_min">97.4%</span> to 
                <span class="legend_number" id="legend_max">99.1%</span>. 
                In 2019, Trains were slightly more reliable than Trams. 
                `
                document.getElementById('legend_min').style.backgroundColor = 'rgba(255,165,0,0.232)'
                document.getElementById('legend_max').style.backgroundColor = 'rgba(255,165,0,0.736)'
                document.getElementById('legend_max').style.color = 'rgba(3, 3, 50, 0.8)'
            } else if (state['metric'] == 'punc') {
                legend_container.innerHTML = `
                The Punctuality of services on both networks range from 
                <span class="legend_number" id="legend_min">73.1%</span> to 
                <span class="legend_number" id="legend_max">95.8%</span>. 
                In 2019, Trains were more punctual than Trams.
                `
                document.getElementById('legend_min').style.backgroundColor = 'rgba(0,81,82,0.194)'
                document.getElementById('legend_max').style.backgroundColor = 'rgba(0,81,82,0.875)'
            } else {
                legend_container.innerHTML = `
                Service Changes range from 
                <span class="legend_number" id="service_change_1">&lt;-30%</span> to 
                <span class="legend_number" id="service_change_2">-30%</span> to 
                <span class="legend_number" id="service_change_3">-20%</span> to 
                <span class="legend_number" id="service_change_4">-10%</span> to 
                <span class="legend_number" id="service_change_5">20%</span> to 
                <span class="legend_number" id="service_change_6">40%</span> to 
                <span class="legend_number" id="service_change_7">60%</span> to 
                <span class="legend_number" id="service_change_8">&gt;60%</span>. 

                `
                document.getElementById('service_change_1').style.backgroundColor = 'rgba(160,13,13,1)'
                document.getElementById('service_change_2').style.backgroundColor = 'rgba(160,13,13,0.8)'
                document.getElementById('service_change_3').style.backgroundColor = 'rgba(160,13,13,0.6)'
                document.getElementById('service_change_4').style.backgroundColor = 'rgba(160,13,13,0.4)'
                document.getElementById('service_change_5').style.backgroundColor = 'rgba(76,175,43,0.4)'
                document.getElementById('service_change_6').style.backgroundColor = 'rgba(76,175,43,0.6)'
                document.getElementById('service_change_7').style.backgroundColor = 'rgba(76,175,43,0.8)'
                document.getElementById('service_change_7').style.color = 'rgba(3, 3, 50, 0.8)'
                document.getElementById('service_change_8').style.backgroundColor = 'rgba(76,175,43,1)'
                document.getElementById('service_change_8').style.color = 'rgba(3, 3, 50, 0.8)'
            }
        } else {
            legend_container.style.display = 'none'
        }
    }

    // Render Viz Headings
    let render_viz_headings = (state) => {
        tram_network_heading = document.getElementById('tram_heading')
        train_network_heading = document.getElementById('train_heading')
        trend_viz_heading = document.getElementById('trend_heading')
        if (state['metric'] == 'rel') {
            tram_network_heading.innerHTML = 'Tram Network Reliability'
            train_network_heading.innerHTML = 'Train Network Reliability'
            trend_viz_heading.innerHTML = 'Reliability between 2001 and 2019'
        } else if (state['metric'] == 'punc') {
            tram_network_heading.innerHTML = 'Tram Network Punctuality'
            train_network_heading.innerHTML = 'Train Network Punctuality'
            trend_viz_heading.innerHTML = 'Punctuality Between 2001 and 2019'
        } else {
            tram_network_heading.innerHTML = 'Change in Number of Tram Services'
            train_network_heading.innerHTML = 'Change in Number of Train Services'
            trend_viz_heading.innerHTML = 'Change in Number of Services Between 2001 and 2019'
        }
    }

    return {
        render_metric_buttons: render_metric_buttons,
        render_viz_buttons: render_viz_buttons,
        render_selected_viz: render_selected_viz,
        render_tram_route_selector_buttons: render_tram_route_selector_buttons,
        render_train_route_selector_buttons: render_train_route_selector_buttons,
        render_network_lines: render_network_lines,
        clear_network_lines: clear_network_lines,
        render_trend_viz: render_trend_viz,
        clear_trend_viz: clear_trend_viz,
        render_legend: render_legend,
        render_viz_headings: render_viz_headings
    }
})()

// APP CONTROLLER
let appController = (function(dataC, UIC) {

    // Initial Render
    UIC.render_network_lines(dataC.tramNetwork, dataC.app_state)
    UIC.render_network_lines(dataC.trainNetwork, dataC.app_state)
    UIC.render_trend_viz(dataC.app_state)
    UIC.render_legend(dataC.app_state)
    UIC.render_viz_headings(dataC.app_state)
    setTimeout(() => {
        document.getElementById('loader_container').style.opacity = 0
        // document.getElementById('ring').style.opacity = 0
    }, 5000)
    setTimeout(() => {
        document.getElementById('loader_container').style.display = 'none'
    }, 6000)

    // Helper functions
    let toggle = (state, type, el) => {
        if (state['routes'][type].includes(el)) {
            state['routes'][type] = state['routes'][type].filter((selected_route) => {
                return selected_route != el 
            })
        } else {
            state['routes'][type].push(el)
        }
    }

    // Info Tooltip Event Listener
    let tooltip_messages = {
        'Reliability': {
            heading: 'Reliability',
            message: ': The proportion of scheduled services that were actually delivered. i.e. The proportion of scheduled services that were not cancelled.'
        },
        'Punctuality': {
            heading: 'Punctuality',
            message: ': The proportion of services that arrived on time. A service is considered to have arrived on time if it arrived no later than 5 minutes past its scheduled arrival time, and left no earlier than 1 minute before its scheduled departure time. '
        },
        'Service Changes': {
            heading: 'Service Changes',
            message: ': The percentage change in the number of services between 2001 and 2019. A positive percentage means the number of services has been increased since 2001. A negative percentage means the number of services has been reduced since 2001.'
        },
        'Network': {
            heading: 'Network Visualization',
            message: ': Displays performance as a geospatial visualization. For the Reliability and Punctuality metrics, the visualization displays performance in 2019. For the Service Changes metric, the visualization displays the change in number of services between 2001 and 2019.'
        },
        'Trend': {
            heading: 'Trend Visualization',
            message: ': Displays the change in performance between 2001 to 2019 as a line chart.'
        }
    }
    document.querySelectorAll('.type_selector').forEach((button) => {
        button.addEventListener('mouseover', () => {
            let tooltip = document.getElementById('info_tooltip')
            let tooltip_heading = document.getElementById('info_tooltip_heading')
            let tooltip_message = document.getElementById('info_tooltip_message')
            tooltip_heading.innerHTML = tooltip_messages[button.innerHTML]['heading']
            tooltip_message.innerHTML = tooltip_messages[button.innerHTML]['message']
            info_tooltip.style.display = 'block'
        })

        button.addEventListener('mouseout', () => {
            document.getElementById('info_tooltip').style.display = 'none'
        })
    })

    // Metric Select Event Listener
    document.querySelectorAll('.metric_selector').forEach((button) => {
        button.addEventListener('click', () => {
            // Get selected button value
            let selected_metric = button.id

            // Update state
            dataC.app_state['metric'] = selected_metric
            
            // Render updated metric buttons 
            UIC.render_metric_buttons(dataC.app_state)

            // Clear Tram and Train lines
            UIC.clear_network_lines(dataC.tramNetwork)
            UIC.clear_network_lines(dataC.trainNetwork)

            // Render updated Tram and Train lines
            UIC.render_network_lines(dataC.tramNetwork, dataC.app_state)
            UIC.render_network_lines(dataC.trainNetwork, dataC.app_state)

            // Clear Trend viz
            UIC.clear_trend_viz()

            // Render updated Trend viz
            UIC.render_trend_viz(dataC.app_state)

            // Render Legend
            UIC.render_legend(dataC.app_state)

            // Render Heading
            UIC.render_viz_headings(dataC.app_state)
        })
    })

    // Visualization Select Event Listener
    document.querySelectorAll('.viz_selector').forEach((button) => {
        button.addEventListener('click', () => {
            // Get selected button value
            let selected_viz = button.id

            // Update state
            dataC.app_state['viz'] = selected_viz

            // Render updated viz buttons 
            UIC.render_viz_buttons(dataC.app_state)

            // Render selected viz
            UIC.render_selected_viz(dataC.app_state)

            // Render Legend
            UIC.render_legend(dataC.app_state)
        })
    })

    // Tram Route Select Event Listener
    document.querySelectorAll('.tram_route_button').forEach((button) => {
        button.addEventListener('click', () => {
            // Get selected tram route
            let tram_route = button.innerHTML
            
            // Toggle tram route from state
            toggle(dataC.app_state, 'tram', tram_route)
            
            // Render updated tram route selector buttons
            UIC.render_tram_route_selector_buttons(dataC.app_state)

            // Clear Tram lines
            UIC.clear_network_lines(dataC.tramNetwork)

            // Render updated Tram lines
            UIC.render_network_lines(dataC.tramNetwork, dataC.app_state)

            // Clear Trend viz
            UIC.clear_trend_viz()

            // Render updated Trend viz
            UIC.render_trend_viz(dataC.app_state)
        })
    })

    // Train Route Select Event Listener
    document.querySelectorAll('.train_route_button').forEach((button) => {
        button.addEventListener('click', () => {
            // Get selected train route
            let train_route = button.innerHTML

            // Toggle train route from state
            toggle(dataC.app_state, 'train', train_route)

            // Render updated train route selector buttons
            UIC.render_train_route_selector_buttons(dataC.app_state)

            // Clear Train lines
            UIC.clear_network_lines(dataC.trainNetwork)

            // Render updated Train lines
            UIC.render_network_lines(dataC.trainNetwork, dataC.app_state)

            // Clear Trend viz
            UIC.clear_trend_viz()

            // Render updated Trend viz
            UIC.render_trend_viz(dataC.app_state)
        })
    })
})(dataController, UIController)
